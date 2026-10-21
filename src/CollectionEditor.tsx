import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  Pencil,
  QrCode,
  Trash2,
  X,
} from 'lucide-react'
import { formatBytes, type InventoryEntry } from './inventory'
import type { Collection, CollectionResource } from './manifest'

type Props = {
  collection: Collection
  inventory: InventoryEntry[]
  onClose: () => void
  onRename: (id: string, name: string, description: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onExport: (collection: Collection) => void
  onShare: (collection: Collection) => void
  onAddResource: (collectionId: string, resource: CollectionResource) => void
  onUpdateResource: (
    collectionId: string,
    resourceId: string,
    patch: Partial<Omit<CollectionResource, 'id'>>,
  ) => void
  onRemoveResource: (collectionId: string, resourceId: string) => void
  onMoveResource: (collectionId: string, resourceId: string, offset: number) => void
}

type ResourceDraft = {
  title: string
  language: string
  description: string
  sourceUrl: string
}

function ResourceRow({
  resource,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  resource: CollectionResource
  index: number
  total: number
  onUpdate: (patch: Partial<Omit<CollectionResource, 'id'>>) => void
  onRemove: () => void
  onMove: (offset: number) => void
}) {
  const [draft, setDraft] = useState<ResourceDraft>({
    title: resource.title,
    language: resource.language,
    description: resource.description ?? '',
    sourceUrl: resource.sourceUrl ?? '',
  })
  const [error, setError] = useState('')

  function commit() {
    if (!draft.title.trim()) {
      setError('A resource needs a title.')
      return
    }
    if (!draft.language.trim()) {
      setError('A resource needs a language code, for example "en".')
      return
    }
    setError('')
    onUpdate({
      title: draft.title.trim(),
      language: draft.language.trim(),
      description: draft.description.trim() || undefined,
      sourceUrl: draft.sourceUrl.trim() || undefined,
    })
  }

  return (
    <li className="py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor={`title-${resource.id}`}>
            Title of {resource.title}
          </label>
          <input
            id={`title-${resource.id}`}
            value={draft.title}
            maxLength={120}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            onBlur={commit}
            className="min-h-10 w-full rounded-md border border-stone-300 px-3 text-sm font-medium outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
          />
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <label className="sr-only" htmlFor={`language-${resource.id}`}>
                Language of {resource.title}
              </label>
              <input
                id={`language-${resource.id}`}
                value={draft.language}
                maxLength={12}
                placeholder="Language, for example en"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, language: event.target.value }))
                }
                onBlur={commit}
                className="min-h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor={`source-${resource.id}`}>
                Source URL of {resource.title}
              </label>
              <input
                id={`source-${resource.id}`}
                value={draft.sourceUrl}
                type="url"
                placeholder="Source URL (optional)"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, sourceUrl: event.target.value }))
                }
                onBlur={commit}
                className="min-h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
              />
            </div>
          </div>
          <div className="mt-2">
            <label className="sr-only" htmlFor={`description-${resource.id}`}>
              Description of {resource.title}
            </label>
            <input
              id={`description-${resource.id}`}
              value={draft.description}
              maxLength={240}
              placeholder="Description (optional)"
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              onBlur={commit}
              className="min-h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            {resource.filename ? `${resource.filename} · ` : ''}
            {typeof resource.sizeBytes === 'number' ? `${formatBytes(resource.sizeBytes)} · ` : ''}
            {resource.zimUuid ? `UUID ${resource.zimUuid}` : 'no ZIM identity recorded'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Move resource up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
            className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 bg-white hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            aria-label="Move resource down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
            className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 bg-white hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            aria-label={`Remove ${resource.title}`}
            onClick={onRemove}
            className="inline-flex size-10 items-center justify-center rounded-md border border-stone-300 bg-white text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
    </li>
  )
}

export function CollectionEditor({
  collection,
  inventory,
  onClose,
  onRename,
  onDelete,
  onDuplicate,
  onExport,
  onShare,
  onAddResource,
  onUpdateResource,
  onRemoveResource,
  onMoveResource,
}: Props) {
  const [name, setName] = useState(collection.name)
  const [description, setDescription] = useState(collection.description)
  const [nameError, setNameError] = useState('')
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [manualTitle, setManualTitle] = useState('')
  const [manualLanguage, setManualLanguage] = useState('')
  const [manualDescription, setManualDescription] = useState('')
  const [manualSourceUrl, setManualSourceUrl] = useState('')
  const [manualError, setManualError] = useState('')
  const [inventoryChoice, setInventoryChoice] = useState('')

  const availableInventory = inventory.filter(
    (entry) => !collection.resources.some((resource) => resource.id === entry.id),
  )

  function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setNameError('Enter a name for your collection.')
      return
    }
    setNameError('')
    onRename(collection.id, name.trim(), description.trim())
  }

  function handleAddManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!manualTitle.trim()) {
      setManualError('A resource needs a title.')
      return
    }
    if (!manualLanguage.trim()) {
      setManualError('A resource needs a language code, for example "en".')
      return
    }
    setManualError('')
    onAddResource(collection.id, {
      id: `resource-${crypto.randomUUID()}`,
      title: manualTitle.trim(),
      language: manualLanguage.trim(),
      description: manualDescription.trim() || undefined,
      sourceUrl: manualSourceUrl.trim() || undefined,
    })
    setManualTitle('')
    setManualDescription('')
    setManualSourceUrl('')
  }

  function handleAddFromInventory() {
    const entry = inventory.find((item) => item.id === inventoryChoice)
    if (!entry) return
    onAddResource(collection.id, {
      id: entry.id,
      title: entry.title,
      language: entry.language,
      sizeBytes: entry.sizeBytes,
      filename: entry.fileName,
      zimUuid: entry.zimUuid,
    })
    setInventoryChoice('')
  }

  return (
    <section aria-labelledby="editor-title">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
      >
        <X aria-hidden="true" size={16} />
        Back to collections
      </button>

      <div className="mt-4 flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-800">Collection</p>
          <h2 id="editor-title" className="mt-1 text-xl font-semibold tracking-tight">
            {collection.name}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {collection.resources.length}{' '}
            {collection.resources.length === 1 ? 'resource' : 'resources'} · created{' '}
            {new Date(collection.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onExport(collection)}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            <Download aria-hidden="true" size={16} />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => onShare(collection)}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            <QrCode aria-hidden="true" size={16} />
            Share QR
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(collection.id)}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            <Copy aria-hidden="true" size={16} />
            Duplicate
          </button>
          {isConfirmingDelete ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onDelete(collection.id)}
                className="inline-flex min-h-10 items-center gap-2 rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
              >
                <Trash2 aria-hidden="true" size={16} />
                Confirm delete
              </button>
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="min-h-10 rounded-md border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              <Trash2 aria-hidden="true" size={16} />
              Delete
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleRename} className="py-6">
        <h3 className="text-sm font-semibold tracking-tight">Collection details</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="editor-name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="editor-name"
              value={name}
              maxLength={80}
              onChange={(event) => {
                setName(event.target.value)
                setNameError('')
              }}
              aria-invalid={Boolean(nameError)}
              className="mt-1.5 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />
            {nameError && (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {nameError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="editor-description" className="block text-sm font-medium">
              Description
            </label>
            <input
              id="editor-description"
              value={description}
              maxLength={240}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          <Pencil aria-hidden="true" size={16} />
          Save details
        </button>
      </form>

      <div className="border-t border-stone-200 py-6">
        <h3 className="text-sm font-semibold tracking-tight">Resources</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Resources describe the archives a reader should have. The collection stores
          their metadata, never the files themselves.
        </p>

        {collection.resources.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-stone-300 p-4 text-sm text-slate-600">
            This collection has no resources yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-200">
            {collection.resources.map((resource, index) => (
              <ResourceRow
                key={`${resource.id}:${resource.title}:${resource.language}`}
                resource={resource}
                index={index}
                total={collection.resources.length}
                onUpdate={(patch) => onUpdateResource(collection.id, resource.id, patch)}
                onRemove={() => onRemoveResource(collection.id, resource.id)}
                onMove={(offset) => onMoveResource(collection.id, resource.id, offset)}
              />
            ))}
          </ul>
        )}

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-stone-200 p-4">
            <h4 className="text-sm font-semibold">Add from the local inventory</h4>
            {availableInventory.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                No inventory archive is left to add. Scan more archives in the Local
                Inventory section.
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="inventory-choice">
                  Archive from the local inventory
                </label>
                <select
                  id="inventory-choice"
                  value={inventoryChoice}
                  onChange={(event) => setInventoryChoice(event.target.value)}
                  className="min-h-10 flex-1 rounded-md border border-stone-300 bg-white px-2 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
                >
                  <option value="">Choose an archive…</option>
                  {availableInventory.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title} ({entry.fileName})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddFromInventory}
                  disabled={!inventoryChoice}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleAddManual} className="rounded-lg border border-stone-200 p-4">
            <h4 className="text-sm font-semibold">Add a resource by hand</h4>
            <label className="sr-only" htmlFor="manual-title">
              Resource title
            </label>
            <input
              id="manual-title"
              value={manualTitle}
              maxLength={120}
              placeholder="Title"
              onChange={(event) => setManualTitle(event.target.value)}
              className="mt-3 min-h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />
            <label className="sr-only" htmlFor="manual-language">
              Resource language
            </label>
            <input
              id="manual-language"
              value={manualLanguage}
              maxLength={12}
              placeholder="Language, for example en"
              onChange={(event) => setManualLanguage(event.target.value)}
              className="mt-2 min-h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />
            <label className="sr-only" htmlFor="manual-description">
              Resource description
            </label>
            <input
              id="manual-description"
              value={manualDescription}
              maxLength={240}
              placeholder="Description (optional)"
              onChange={(event) => setManualDescription(event.target.value)}
              className="mt-2 min-h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />
            <label className="sr-only" htmlFor="manual-source">
              Resource source URL
            </label>
            <input
              id="manual-source"
              value={manualSourceUrl}
              type="url"
              placeholder="Source URL (optional)"
              onChange={(event) => setManualSourceUrl(event.target.value)}
              className="mt-2 min-h-10 w-full rounded-md border border-stone-300 px-3 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
            />
            {manualError && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {manualError}
              </p>
            )}
            <button
              type="submit"
              className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-800 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Add resource
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default CollectionEditor
