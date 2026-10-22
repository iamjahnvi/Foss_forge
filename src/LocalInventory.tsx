import { useRef, useState } from 'react'
import { HardDrive, Plus, Trash2 } from 'lucide-react'
import { canPickFiles, pickZimFiles } from './filePicker'
import { formatBytes, type InventoryEntry } from './inventory'
import type { Collection } from './manifest'

type Props = {
  entries: InventoryEntry[]
  collections: Collection[]
  isScanning: boolean
  error: string
  message: string
  onScanFiles: (files: File[]) => void
  onAddToCollection: (collectionId: string, entry: InventoryEntry) => void
  onRemoveEntry: (entryId: string) => void
}

export function LocalInventory({
  entries,
  collections,
  isScanning,
  error,
  message,
  onScanFiles,
  onAddToCollection,
  onRemoveEntry,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [targets, setTargets] = useState<Record<string, string>>({})

  async function handlePick() {
    if (!canPickFiles()) {
      inputRef.current?.click()
      return
    }
    const files = await pickZimFiles()
    if (files && files.length > 0) {
      onScanFiles(files)
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (files.length > 0) {
      onScanFiles(files)
    }
  }

  return (
    <section aria-labelledby="inventory-title">
      <div className="border-b border-stone-200 pb-5">
        <p className="text-sm font-medium text-emerald-800">Your own archives</p>
        <h2 id="inventory-title" className="mt-1 text-xl font-semibold tracking-tight">
          Local Inventory
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Scan the ZIM archives you already have. The app reads each archive header to
          record its identity, size and version. Files stay on your machine; only the
          metadata is stored.
        </p>
      </div>

      <div className="py-6">
        <input
          ref={inputRef}
          type="file"
          accept=".zim,application/octet-stream"
          multiple
          aria-label="Choose ZIM archives to scan"
          onChange={handleInputChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={handlePick}
          disabled={isScanning}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <HardDrive aria-hidden="true" size={18} />
          {isScanning ? 'Scanning…' : 'Scan ZIM archives'}
        </button>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900"
          >
            {message}
          </p>
        )}

        {entries.length === 0 ? (
          <div className="mt-8 flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 px-6 py-10 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-stone-100 text-slate-600">
              <HardDrive aria-hidden="true" size={24} />
            </span>
            <h3 className="mt-4 text-base font-semibold">The inventory is empty</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              Scan the archives you own to reuse their metadata in your collections.
            </p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-stone-200">
            {entries.map((entry) => {
              const target = targets[entry.id] ?? collections[0]?.id ?? ''
              const targetCollection = collections.find(
                (collection) => collection.id === target,
              )
              const alreadyAdded = targetCollection
                ? targetCollection.resources.some((resource) => resource.id === entry.id)
                : false

              return (
                <li key={entry.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{entry.title}</h3>
                    <p className="mt-1 truncate text-sm text-slate-600">{entry.fileName}</p>
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <div className="flex gap-1">
                        <dt className="font-medium">Size:</dt>
                        <dd>{formatBytes(entry.sizeBytes)}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-medium">Format:</dt>
                        <dd>{entry.version}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-medium">Articles:</dt>
                        <dd>{entry.articleCount.toLocaleString()}</dd>
                      </div>
                      <div className="flex gap-1">
                        <dt className="font-medium">Language:</dt>
                        <dd>{entry.language}</dd>
                      </div>
                      {entry.checksum && (
                        <div className="flex gap-1">
                          <dt className="font-medium">Checksum:</dt>
                          <dd className="font-mono">{entry.checksum}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`target-${entry.id}`}>
                        Collection for {entry.title}
                      </label>
                      <select
                        id={`target-${entry.id}`}
                        value={target}
                        onChange={(event) =>
                          setTargets((current) => ({
                            ...current,
                            [entry.id]: event.target.value,
                          }))
                        }
                        disabled={collections.length === 0}
                        className="min-h-10 rounded-md border border-stone-300 bg-white px-2 text-sm outline-none focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/20"
                      >
                        {collections.length === 0 && <option value="">No collections yet</option>}
                        {collections.map((collection) => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!targetCollection || alreadyAdded}
                        onClick={() => targetCollection && onAddToCollection(targetCollection.id, entry)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus aria-hidden="true" size={16} />
                        {alreadyAdded ? 'Already added' : 'Add to collection'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveEntry(entry.id)}
                      className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
                    >
                      <Trash2 aria-hidden="true" size={16} />
                      Remove from inventory
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export default LocalInventory
