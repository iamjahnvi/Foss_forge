import type { Collection } from '../../shared/manifest.js'

export type CollectionStore = {
  list(): Collection[]
  replaceAll(collections: Collection[]): Collection[]
  remove(id: string): boolean
  clear(): void
}

// The store keeps collections in memory for the lifetime of the API process.
// The browser keeps its own copy and re-sends the full list on every change,
// so a server restart does not lose data.
export function createCollectionStore(initial: Collection[] = []): CollectionStore {
  let collections = new Map<string, Collection>(
    initial.map((collection) => [collection.id, collection]),
  )

  function list(): Collection[] {
    return [...collections.values()]
  }

  function replaceAll(next: Collection[]): Collection[] {
    collections = new Map<string, Collection>(
      next.map((collection) => [collection.id, collection]),
    )
    return list()
  }

  function remove(id: string): boolean {
    return collections.delete(id)
  }

  function clear(): void {
    collections = new Map()
  }

  return { list, replaceAll, remove, clear }
}
