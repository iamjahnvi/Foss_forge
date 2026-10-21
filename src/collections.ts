import type { CollectionManifest, CollectionResource } from './manifest'

export type Collection = {
  id: string
  name: string
  description: string
  createdAt: string
  resources: CollectionResource[]
}

export function createCollection(
  name: string,
  description: string,
  id: string = crypto.randomUUID(),
): Collection {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('A collection name is required.')
  }

  return {
    id,
    name: trimmedName,
    description: description.trim(),
    createdAt: new Date().toISOString(),
    resources: [],
  }
}

export function addImportedCollection(
  imported: CollectionManifest,
  existingCollections: Collection[],
  createId: () => string = () => crypto.randomUUID(),
): Collection {
  const existingIds = new Set(existingCollections.map((collection) => collection.id))
  let id = imported.id

  if (existingIds.has(id)) {
    do {
      id = createId()
    } while (existingIds.has(id))
  }

  return { ...imported, id }
}
