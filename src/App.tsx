import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { BookOpen, Boxes, CircleHelp, Download, Plus, Upload, X } from 'lucide-react'
import { addImportedCollection, createCollection, type Collection } from './collections'
import {
  manifestFilename,
  parseManifest,
  serializeManifest,
  type CollectionManifest,
} from './manifest'

type Section = 'Collections' | 'Import / Export' | 'Local Inventory'

const sections: { label: Section; icon: typeof Boxes }[] = [
  { label: 'Collections', icon: Boxes },
  { label: 'Import / Export', icon: BookOpen },
  { label: 'Local Inventory', icon: CircleHelp },
]

function App() {
  const [activeSection, setActiveSection] = useState<Section>('Collections')
  const [collections, setCollections] = useState<Collection[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')
  const [pendingImport, setPendingImport] = useState<CollectionManifest | null>(null)
  const [importError, setImportError] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

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

    setCollections((current) => [...current, createCollection(name, description)])
    closeCreateDialog()
  }

  function handleExport(collection: Collection) {
    const manifest: CollectionManifest = {
      schemaVersion: 1,
      id: collection.id,
      name: collection.name,
      description: collection.description,
      createdAt: collection.createdAt,
      resources: collection.resources,
    }
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

  function confirmImport() {
    if (!pendingImport) return

    const imported = addImportedCollection(pendingImport, collections)
    const idWasChanged = imported.id !== pendingImport.id
    setCollections((current) => [...current, imported])
    setPendingImport(null)
    setImportError('')
    setImportMessage(
      idWasChanged
        ? 'Collection imported. Its ID was changed to avoid a conflict with an existing collection.'
        : 'Collection imported successfully.',
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
          <a href="#" className="flex w-fit items-center gap-3 text-inherit no-underline">
            <span className="flex size-10 items-center justify-center rounded-md bg-emerald-800 text-white">
              <BookOpen aria-hidden="true" size={22} />
            </span>
            <span className="text-lg font-semibold tracking-tight">Kiwix Collections</span>
          </a>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Your offline knowledge, organized.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Curate and share collections of offline knowledge resources. Your collections
              describe resources; they do not contain or distribute ZIM files.
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
          {activeSection === 'Collections' ? (
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
                      <div>
                        <h3 className="font-semibold">{collection.name}</h3>
                        {collection.description && (
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {collection.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-slate-500">
                          {collection.resources.length} resources
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExport(collection)}
                        className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                      >
                        <Download aria-hidden="true" size={16} />
                        Export JSON
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : activeSection === 'Import / Export' ? (
            <section aria-labelledby="import-export-title">
              <div className="border-b border-stone-200 pb-5">
                <p className="text-sm font-medium text-emerald-800">Portable manifests</p>
                <h2 id="import-export-title" className="mt-1 text-xl font-semibold tracking-tight">
                  Import / Export
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  Import a Kiwix Collections version 1 JSON manifest to preview and add its
                  metadata. Manifests contain references only, not ZIM file contents.
                </p>
              </div>
              <div className="py-6">
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
          ) : (
            <section className="border-b border-stone-200 pb-5">
              <p className="text-sm font-medium text-emerald-800">Coming later</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">{activeSection}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                This area is a placeholder for a future step. No files are scanned, imported,
                exported, or processed in this foundation.
              </p>
            </section>
          )}
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
    </div>
  )
}

export default App
