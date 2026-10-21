import {
  CURRENT_SCHEMA_VERSION,
  UNDETERMINED_LANGUAGE,
  type Collection,
  type CollectionManifest,
  type CollectionResource,
} from './manifest'
import { formatZimVersion, guessLanguage } from './zim'

export type { Collection }

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

// A collection is a manifest without the format marker, so exporting one only
// means adding `schemaVersion`.
export function collectionToManifest(collection: Collection): CollectionManifest {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: collection.id,
    name: collection.name,
    description: collection.description,
    createdAt: collection.createdAt,
    resources: collection.resources,
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

export function addResource(
  collection: Collection,
  resource: CollectionResource,
): Collection {
  if (collection.resources.some((existing) => existing.id === resource.id)) {
    throw new Error(`Resource with ID "${resource.id}" already exists in this collection.`)
  }
  return { ...collection, resources: [...collection.resources, resource] }
}

export function removeResource(
  collection: Collection,
  resourceId: string,
): Collection {
  const next = collection.resources.filter((resource) => resource.id !== resourceId)
  return { ...collection, resources: next }
}

export function updateResource(
  collection: Collection,
  resourceId: string,
  patch: Partial<Omit<CollectionResource, 'id'>>,
): Collection {
  let found = false
  const next = collection.resources.map((resource) => {
    if (resource.id !== resourceId) return resource
    found = true
    return { ...resource, ...patch }
  })
  if (!found) {
    throw new Error(`Resource with ID "${resourceId}" was not found in this collection.`)
  }
  return { ...collection, resources: next }
}

// Moves a resource by `offset` positions. The order of the resources is the
// order a reader is expected to work through them in.
export function moveResource(
  collection: Collection,
  resourceId: string,
  offset: number,
): Collection {
  const index = collection.resources.findIndex((resource) => resource.id === resourceId)
  if (index === -1) {
    throw new Error(`Resource with ID "${resourceId}" was not found in this collection.`)
  }

  const target = index + offset
  if (target < 0 || target >= collection.resources.length) {
    return collection
  }

  const resources = [...collection.resources]
  const [moved] = resources.splice(index, 1)
  resources.splice(target, 0, moved)
  return { ...collection, resources }
}

export function duplicateCollection(
  collection: Collection,
  id: string = crypto.randomUUID(),
): Collection {
  return {
    ...collection,
    id,
    name: `${collection.name} (copy)`,
    createdAt: new Date().toISOString(),
    resources: collection.resources.map((resource) => ({ ...resource })),
  }
}

export function resourceFromZimFile(
  file: File,
  header: {
    uuid: string
    articleCount: number
    clusterCount: number
    majorVersion: number
    minorVersion: number
  },
  overrides: Partial<Omit<CollectionResource, 'id'>> = {},
): CollectionResource {
  const title = overrides.title ?? file.name.replace(/\.zim$/i, '')
  const language = overrides.language || guessLanguage(file.name)
  const resource: CollectionResource = {
    id: `zim-${header.uuid}`,
    title,
    language: language || UNDETERMINED_LANGUAGE,
    sizeBytes: file.size,
    filename: file.name,
    zimUuid: header.uuid,
    zimVersion: formatZimVersion(header),
  }
  if (overrides.description) resource.description = overrides.description
  if (overrides.sourceUrl) resource.sourceUrl = overrides.sourceUrl
  if (overrides.sha256) resource.sha256 = overrides.sha256
  if (overrides.zimChecksum) resource.zimChecksum = overrides.zimChecksum
  return resource
}
