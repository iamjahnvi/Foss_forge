import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { BookOpen, Boxes, Download, Plus, QrCode, Send, Upload, X } from 'lucide-react'
import { CollectionEditor } from './CollectionEditor'
import { CompatibilityReportView } from './CompatibilityReport'
import { buildCompatibilityReport } from './compatibility'
import { QrScanner } from './QrScanner'
import { QrShareDialog } from './QrShareDialog'
import {
  addImportedCollection,
  addResource,
  collectionToManifest,
  createCollection,
  duplicateCollection,
  moveResource,
  removeResource,
  updateResource,
  type Collection,
} from './collections'
import {
  manifestFilename,
  parseManifest,
  serializeManifest,
  CURRENT_SCHEMA_VERSION,
  type CollectionManifest,
  type CollectionResource,
} from './manifest'
import { inventoryEntryToResource } from './inventory'
import { useCollections } from './useCollections'
import { useInventory } from './useInventory'
import { readAccountProfile, readAccountToken } from './account'
import { fetchReceived, fetchRecipients, fetchTransfer, sendCollection as sendToRecipient, type ReceivedTransfer, type RecipientProfile } from './transfers'

type Section = 'Collections' | 'Import / Export'

const sections: { label: Section; icon: typeof Boxes }[] = [
  { label: 'Collections', icon: Boxes },
  { label: 'Import / Export', icon: BookOpen },
]

function App({ transferId }: { transferId?: string } = {}) {
  const [account] = useState(readAccountProfile)
  const [token] = useState(readAccountToken)
  const [activeSection, setActiveSection] = useState<Section>(transferId ? 'Import / Export' : 'Collections')
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [pendingImport, setPendingImport] = useState<CollectionManifest | null>(null)
  const [importError, setImportError] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [collectionMessage, setCollectionMessage] = useState('')
  const [sharedManifest, setSharedManifest] = useState<CollectionManifest | null>(null)
  const [recipients, setRecipients] = useState<RecipientProfile[]>([])
  const [received, setReceived] = useState<ReceivedTransfer[]>([])
  const [recipientId, setRecipientId] = useState('')
  const [transferCollectionId, setTransferCollectionId] = useState('')
  const [transferMessage, setTransferMessage] = useState('')
  const [transferError, setTransferError] = useState('')
  const [sending, setSending] = useState(false)
  const [transferLink, setTransferLink] = useState('')
  const [transferQr, setTransferQr] = useState<{ manifest: CollectionManifest; link: string } | null>(null)
  const [pendingTransfer, setPendingTransfer] = useState<ReceivedTransfer | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const {
    collections,
    syncStatus,
    syncError,
    addCollection,
    updateCollection,
    removeCollection,
    replaceCollections,
  } = useCollections()
  const inventory = useInventory()

  useEffect(() => {
    if (!transferId) return
    if (!token || account?.role !== 'recipient') {
      window.localStorage.setItem('kiwix-collections:pending-transfer', transferId)
      setTransferError('Sign in with the recipient account to open this collection link.')
      return
    }
    void fetchTransfer(token, transferId).then(setPendingTransfer).catch((error: unknown) => {
      setTransferError(error instanceof Error ? error.message : 'Could not open this transfer.')
    })
  }, [transferId, token, account])

  useEffect(() => {
    if (!token || activeSection !== 'Import / Export') return
    if (account?.role === 'sender') {
      void fetchRecipients(token).then(setRecipients).catch((error: unknown) => setTransferError(error instanceof Error ? error.message : 'Could not load recipients.'))
    } else if (account?.role === 'recipient') {
      void fetchReceived(token).then(setReceived).catch((error: unknown) => setTransferError(error instanceof Error ? error.message : 'Could not load received collections.'))
    }
  }, [activeSection, account, token])

  // The compatibility report compares the manifest that is about to be imported
  // with the archives this machine actually has.
  const importReport = useMemo(
    () =>
      pendingImport
        ? buildCompatibilityReport(pendingImport.resources, inventory.entries)
        : null,
    [pendingImport, inventory.entries],
  )

  const openCollection = useMemo(
    () => collections.find((collection) => collection.id === openCollectionId) ?? null,
    [collections, openCollectionId],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (isCreateOpen && dialog && !dialog.open) {
      dialog.showModal()
    }
  }, [isCreateOpen])

  function closeCreateDialog() {
    setIsCreateOpen(false)
    setName('')
    setDescription('')
    setNameError('')
  }

  function handleCreateCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setNameError('Enter a name for your collection.')
      return
    }

    addCollection(createCollection(name, description))
    closeCreateDialog()
  }

  function handleExport(collection: Collection) {
    const manifest = collectionToManifest(collection)
    const file = new Blob([serializeManifest(manifest)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = manifestFilename(collection.name)
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function handleShare(collection: Collection) {
    setSharedManifest(collectionToManifest(collection))
  }

  async function handleSendCollection() {
    if (!account || account.role !== 'sender' || !token || !recipientId || !transferCollectionId) return
    const collection = collections.find((item) => item.id === transferCollectionId)
    if (!collection) return
    setSending(true)
    setTransferError('')
    setTransferMessage('')
    try {
      const transfer = await sendToRecipient(token, recipientId, collectionToManifest(collection))
      const link = `${window.location.origin}${window.location.pathname}#/receive/${transfer.id}`
      setTransferLink(link)
      setTransferMessage(`Sent “${transfer.collection.name}” to ${recipients.find((item) => item.kiwiId === recipientId)?.name ?? 'recipient'}. Share this private link with them.`)
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : 'Could not send this collection.')
    } finally {
      setSending(false)
    }
  }

  async function handleCopyTransferLink() {
    try {
      await navigator.clipboard.writeText(transferLink)
      setTransferMessage('Transfer link copied.')
    } catch {
      setTransferError('Could not copy the link. Select and copy it from the field.')
    }
  }

  function importReceived(transfer: ReceivedTransfer) {
    setPendingImport(transfer.collection)
    setPendingTransfer(null)
    setActiveSection('Import / Export')
    setImportMessage(`Collection sent by ${transfer.sender.name}. Review it below to import.`)
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    setPendingImport(null)
    setImportError('')
    setImportMessage('')
    try {
      setPendingImport(parseManifest(await file.text()))
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'The selected file could not be read. Please choose a valid JSON manifest.',
      )
    }
  }

  // A QR code carries the manifest itself, so it is read and then handled
  // exactly like a manifest that was read from a file.
  function handleDecodedQr(text: string) {
    setPendingImport(null)
    setImportError('')
    setImportMessage('')
    try {
      setPendingImport(parseManifest(text))
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'The QR code does not carry a valid JSON manifest.',
      )
    }
  }

  function confirmImport() {
    if (!pendingImport) return

    const imported = addImportedCollection(pendingImport, collections)
    const idWasChanged = imported.id !== pendingImport.id
    replaceCollections([...collections, imported])
    setPendingImport(null)
    setImportError('')
    setImportMessage(
      idWasChanged
        ? 'Collection imported. Its ID was changed to avoid a conflict with an existing collection.'
        : 'Collection imported successfully.',
    )
  }

  function handleAddResource(collectionId: string, resource: CollectionResource) {
    setCollectionMessage('')
    try {
      updateCollection(collectionId, (collection) => addResource(collection, resource))
    } catch (error) {
      setCollectionMessage(error instanceof Error ? error.message : 'The resource was not added.')
    }
  }

  async function handleScanAndAddArchives(collectionId: string, files: File[]) {
    const scanned = await inventory.scan(files)
    for (const entry of scanned) handleAddResource(collectionId, inventoryEntryToResource(entry))
  }

  function handleUpdateResource(
    collectionId: string,
    resourceId: string,
    patch: Partial<Omit<CollectionResource, 'id'>>,
  ) {
    updateCollection(collectionId, (collection) => updateResource(collection, resourceId, patch))
  }

  function handleRemoveResource(collectionId: string, resourceId: string) {
    updateCollection(collectionId, (collection) => removeResource(collection, resourceId))
  }

  function handleMoveResource(collectionId: string, resourceId: string, offset: number) {
    updateCollection(collectionId, (collection) => moveResource(collection, resourceId, offset))
  }

  function handleRename(collectionId: string, nextName: string, nextDescription: string) {
    updateCollection(collectionId, (collection) => ({
      ...collection,
      name: nextName,
      description: nextDescription,
    }))
  }

  function handleDelete(collectionId: string) {
    removeCollection(collectionId)
    setOpenCollectionId(null)
  }

  function handleDuplicate(collectionId: string) {
    const collection = collections.find((item) => item.id === collectionId)
    if (!collection) return
    addCollection(duplicateCollection(collection))
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <a href="#" className="flex w-fit items-center gap-3 text-inherit no-underline">
              <span className="flex size-10 items-center justify-center rounded-md bg-emerald-800 text-white">
                <BookOpen aria-hidden="true" size={22} />
              </span>
              <span className="text-lg font-semibold tracking-tight">Kiwix Collections</span>
            </a>
            {account && (
              <span className="text-right">
                <span className="block text-sm font-medium">{account.name}</span>
                <span className="block text-xs text-slate-500">@{account.kiwiId} · {account.role}</span>
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Your offline knowledge, organized.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Curate and share collections of offline knowledge resources. Your collections describe resources; they do not contain or distribute ZIM files.
            </p>
            <p className="mt-3 w-fit rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-slate-600">
              {syncStatus === 'local'
                ? 'Collections are stored in this browser only.'
                : 'Loading collections…'}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-6 sm:px-8 sm:py-8 md:grid-cols-[220px_1fr]">
        <nav aria-label="Main navigation" className="flex gap-2 overflow-x-auto md:flex-col">
          {sections.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              aria-current={activeSection === label ? 'page' : undefined}
              onClick={() => setActiveSection(label)}
              className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 ${
                activeSection === label
                  ? 'bg-emerald-50 text-emerald-950'
                  : 'text-slate-600 hover:bg-stone-100 hover:text-slate-900'
              }`}
            >
              <Icon aria-hidden="true" size={18} />
              {label}
            </button>
          ))}
        </nav>

        <main className="min-w-0">
          {syncError && (
            <p
              role="status"
              className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
            >
              {syncError}
            </p>
          )}

          {activeSection === 'Collections' ? (
            openCollection ? (
              <CollectionEditor
                collection={openCollection}
                inventory={inventory.entries}
                showCompatibility={account?.role !== 'sender'}
                onClose={() => setOpenCollectionId(null)}
                onRename={handleRename}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onExport={handleExport}
                onShare={handleShare}
                onAddResource={handleAddResource}
                onScanArchives={(collectionId, files) => void handleScanAndAddArchives(collectionId, files)}
                isScanningArchives={inventory.isScanning}
                inventoryError={inventory.error}
                inventoryMessage={inventory.message}
                onUpdateResource={handleUpdateResource}
                onRemoveResource={handleRemoveResource}
                onMoveResource={handleMoveResource}
              />
            ) : (
              <>
                <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Your library</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight">Collections</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                  >
                    <Plus aria-hidden="true" size={18} />
                    Create collection
                  </button>
                </div>

                {collectionMessage && (
                  <p
                    role="alert"
                    className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
                  >
                    {collectionMessage}
                  </p>
                )}

                {collections.length === 0 ? (
                  <section
                    aria-labelledby="empty-state-title"
                    className="flex min-h-72 flex-col items-center justify-center py-12 text-center"
                  >
                    <span className="flex size-12 items-center justify-center rounded-full bg-stone-100 text-slate-600">
                      <Boxes aria-hidden="true" size={24} />
                    </span>
                    <h3 id="empty-state-title" className="mt-5 text-lg font-semibold">
                      No collections yet
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                      Create a collection to start organizing references to offline knowledge
                      resources. You can add its details now and build on it later.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(true)}
                      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                    >
                      <Plus aria-hidden="true" size={18} />
                      Create collection
                    </button>
                  </section>
                ) : (
                  <ul className="divide-y divide-stone-200">
                    {collections.map((collection) => (
                      <li
                        key={collection.id}
                        className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="min-w-0">
                          <h3 className="font-semibold">{collection.name}</h3>
                          {collection.description && (
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {collection.description}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-slate-500">
                            {collection.resources.length}{' '}
                            {collection.resources.length === 1 ? 'resource' : 'resources'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setOpenCollectionId(collection.id)}
                            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShare(collection)}
                            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                          >
                            <QrCode aria-hidden="true" size={16} />
                            Share QR
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExport(collection)}
                            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                          >
                            <Download aria-hidden="true" size={16} />
                            Export JSON
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )
          ) : activeSection === 'Import / Export' ? (
            <section aria-labelledby="import-export-title">
              <div className="border-b border-stone-200 pb-5">
                <p className="text-sm font-medium text-emerald-800">Portable manifests</p>
                <h2 id="import-export-title" className="mt-1 text-xl font-semibold tracking-tight">
                  Import / Export
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  Import a Kiwix Collections JSON manifest to preview and add its
                  metadata. The preview checks the manifest against the archives on this
                  machine. Manifests contain references only, not ZIM file contents. A
                  collection can also be shared as a QR code from the Collections section.
                </p>
              </div>
              <div className="py-6">
                {transferId && (
                  <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <h3 className="font-semibold">Collection shared with you</h3>
                    {pendingTransfer ? (
                      <>
                        <p className="mt-1 text-sm text-slate-600">{pendingTransfer.collection.name} · sent by {pendingTransfer.sender.name}</p>
                        <button type="button" onClick={() => importReceived(pendingTransfer)} className="mt-3 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">Review and import</button>
                      </>
                    ) : transferError ? (
                      <><p role="alert" className="mt-1 text-sm text-amber-900">{transferError}</p>{!token && <a className="mt-3 inline-block font-semibold text-emerald-900 underline" href="#/login">Login to recipient account</a>}</>
                    ) : <p className="mt-1 text-sm text-slate-600">Loading the shared collection…</p>}
                  </div>
                )}
                {account?.role === 'sender' && (
                  <section aria-labelledby="send-collection-title" className="mb-7 rounded-xl border border-emerald-200 bg-white p-4 sm:p-5">
                    <p className="text-sm font-medium text-emerald-800">Recipient pool</p>
                    <h3 id="send-collection-title" className="mt-1 text-lg font-semibold">Send a collection</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Choose a recipient by name. Their Kiwix ID is checked by the server before the manifest is delivered; ZIM archives stay on your device.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-medium">Recipient
                        <select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-stone-300 bg-white px-3">
                          <option value="">Choose a recipient</option>
                          {recipients.map((recipient) => <option key={recipient.id} value={recipient.kiwiId}>{recipient.name} · {recipient.email} · {recipient.kiwiId}</option>)}
                        </select>
                      </label>
                      <label className="text-sm font-medium">Collection
                        <select value={transferCollectionId} onChange={(event) => setTransferCollectionId(event.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-stone-300 bg-white px-3">
                          <option value="">Choose a collection</option>
                          {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                        </select>
                      </label>
                    </div>
                    <button type="button" disabled={!recipientId || !transferCollectionId || sending} onClick={() => void handleSendCollection()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} />{sending ? 'Sending…' : 'Send collection'}</button>
                    {recipients.length === 0 && <p className="mt-3 text-sm text-slate-500">No recipient accounts are registered yet.</p>}
                  </section>
                )}
                {account?.role === 'recipient' && (
                  <section aria-labelledby="received-title" className="mb-7 rounded-xl border border-emerald-200 bg-white p-4 sm:p-5">
                    <p className="text-sm font-medium text-emerald-800">Recipient inbox</p>
                    <h3 id="received-title" className="mt-1 text-lg font-semibold">Collections sent to you</h3>
                    {received.length ? <ul className="mt-3 divide-y divide-stone-200">{received.map((transfer) => <li key={transfer.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span><strong className="block text-sm">{transfer.collection.name}</strong><span className="text-xs text-slate-600">From {transfer.sender.name} · {transfer.sender.email} · {new Date(transfer.sentAt).toLocaleString()}</span></span><button type="button" onClick={() => importReceived(transfer)} className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-50">Review and import</button></li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No collections have been sent to you yet.</p>}
                  </section>
                )}
                {transferError && !transferId && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm">{transferError}</p>}
                {transferMessage && <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">{transferMessage}</p>}
                {transferLink && (
                  <div className="mb-6 max-w-2xl rounded-lg border border-stone-200 bg-stone-50 p-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Recipient-only transfer link<input readOnly value={transferLink} className="mt-2 min-h-10 w-full rounded-md border border-stone-300 bg-white px-3 text-sm" /></label>
                    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void handleCopyTransferLink()} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium">Copy link</button><button type="button" onClick={() => { const item = collections.find((entry) => entry.id === transferCollectionId); if (item) setTransferQr({ manifest: collectionToManifest(item), link: transferLink }) }} className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium"><QrCode size={16} />QR link</button>{transferCollectionId && <button type="button" onClick={() => { const item = collections.find((entry) => entry.id === transferCollectionId); if (item) handleExport(item) }} className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium"><Download size={16} />Download JSON</button>}</div>
                  </div>
                )}
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  aria-label="Choose a JSON collection manifest"
                  onChange={handleImportFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                >
                  <Upload aria-hidden="true" size={18} />
                  Choose JSON manifest
                </button>

                <QrScanner onDecoded={handleDecodedQr} />

                {importError && (
                  <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
                    {importError}
                  </p>
                )}
                {importMessage && (
                  <p role="status" className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
                    {importMessage}
                  </p>
                )}
                {pendingImport && (
                  <div className="mt-6 max-w-xl border-t border-stone-200 pt-5">
                    <p className="text-sm font-medium text-emerald-800">Ready to import</p>
                    <h3 className="mt-1 text-lg font-semibold">{pendingImport.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {pendingImport.resources.length}{' '}
                      {pendingImport.resources.length === 1 ? 'resource' : 'resources'}
                    </p>
                    {collections.some((collection) => collection.name === pendingImport.name) && (
                      <p className="mt-3 text-sm leading-6 text-amber-800">
                        A collection with this name already exists. Import will add another
                        collection; it will not replace the existing one.
                      </p>
                    )}
                    {collections.some((collection) => collection.id === pendingImport.id) && (
                      <p className="mt-3 text-sm leading-6 text-amber-800">
                        This collection ID is already in use. A new ID will be assigned when
                        imported.
                      </p>
                    )}
                    {importReport && (
                      <CompatibilityReportView
                        report={importReport}
                        inventoryCount={inventory.entries.length}
                      />
                    )}
                    <button
                      type="button"
                      onClick={confirmImport}
                      className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                    >
                      Import collection
                    </button>
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </main>
      </div>

      {isCreateOpen && (
        <dialog
          ref={dialogRef}
          aria-labelledby="create-dialog-title"
          onCancel={(event) => {
            event.preventDefault()
            closeCreateDialog()
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg border border-stone-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40"
        >
          <form onSubmit={handleCreateCollection} className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-dialog-title" className="text-lg font-semibold">
                  Create a collection
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">
                  Give your collection a name and an optional description.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={closeCreateDialog}
                className="rounded p-1 text-slate-500 hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            <label htmlFor="collection-name" className="mt-5 block text-sm font-medium">
              Name
            </label>
            <input
              id="collection-name"
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setNameError('')
              }}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? 'collection-name-error' : undefined}
              className="mt-1.5 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />
            {nameError && (
              <p id="collection-name-error" role="alert" className="mt-1 text-sm text-red-700">
                {nameError}
              </p>
            )}

            <label htmlFor="collection-description" className="mt-4 block text-sm font-medium">
              Description <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="collection-description"
              rows={3}
              maxLength={240}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5 w-full resize-y rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />

            <div className="mt-6 flex flex-col-reverse justify-end gap-2 sm:flex-row">
              <button
                type="button"
                onClick={closeCreateDialog}
                className="min-h-11 rounded-md border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-11 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                Create collection
              </button>
            </div>
          </form>
        </dialog>
      )}

      <QrShareDialog
        open={sharedManifest !== null || transferQr !== null}
        manifest={
          transferQr?.manifest ?? sharedManifest ?? {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            id: '',
            name: '',
            description: '',
            createdAt: '',
            resources: [],
          }
        }
        filename={transferQr ? manifestFilename(transferQr.manifest.name) : sharedManifest ? manifestFilename(sharedManifest.name) : 'collection.json'}
        qrPayload={transferQr?.link}
        onClose={() => { setSharedManifest(null); setTransferQr(null) }}
      />
    </div>
  )
}

export default App
