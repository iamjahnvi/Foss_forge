import { describe, expect, it } from 'vitest'
import {
  addResource,
  collectionToManifest,
  createCollection,
  duplicateCollection,
  moveResource,
  removeResource,
  resourceFromZimFile,
  updateResource,
} from './collections'

describe('createCollection', () => {
  it('trims the collection name and description', () => {
    expect(createCollection('  World history  ', '  A reading list  ', 'collection-1')).toEqual({
      id: 'collection-1',
      name: 'World history',
      description: 'A reading list',
      createdAt: expect.any(String),
      resources: [],
    })
  })

  it('rejects a name containing only whitespace', () => {
    expect(() => createCollection('   ', '')).toThrow('A collection name is required.')
  })
})

describe('resource management', () => {
  const collection = createCollection('History', 'A reading list', 'collection-1')
  const resource = {
    id: 'zim-aaaa1111-2222-3333-4444-555566667777',
    title: 'History encyclopedia',
    language: 'en',
    sizeBytes: 1024,
    filename: 'history_en.zim',
    zimUuid: 'aaaa1111-2222-3333-4444-555566667777',
  }

  it('adds a resource to a collection', () => {
    const updated = addResource(collection, resource)
    expect(updated.resources).toEqual([resource])
    expect(updated).not.toBe(collection)
  })

  it('rejects a duplicate resource id', () => {
    expect(() => addResource(addResource(collection, resource), resource)).toThrow(
      /already exists/,
    )
  })

  it('removes a resource by id', () => {
    const updated = removeResource(addResource(collection, resource), resource.id)
    expect(updated.resources).toEqual([])
  })

  it('ignores removal of a missing resource id', () => {
    const updated = removeResource(collection, 'missing')
    expect(updated.resources).toEqual([])
  })

  it('updates a resource field', () => {
    const updated = updateResource(addResource(collection, resource), resource.id, {
      title: 'World history',
    })
    expect(updated.resources[0].title).toBe('World history')
  })

  it('throws when updating a missing resource', () => {
    expect(() => updateResource(collection, 'missing', { title: 'x' })).toThrow(
      /was not found/,
    )
  })
})

describe('moveResource', () => {
  const first = { id: 'a', title: 'A', language: 'en' }
  const second = { id: 'b', title: 'B', language: 'en' }
  const third = { id: 'c', title: 'C', language: 'en' }
  const collection = {
    ...createCollection('Ordered', '', 'collection-1'),
    resources: [first, second, third],
  }

  it('moves a resource up', () => {
    const updated = moveResource(collection, 'b', -1)
    expect(updated.resources.map((resource) => resource.id)).toEqual(['b', 'a', 'c'])
  })

  it('moves a resource down', () => {
    const updated = moveResource(collection, 'a', 1)
    expect(updated.resources.map((resource) => resource.id)).toEqual(['b', 'a', 'c'])
  })

  it('keeps the order when the target is out of range', () => {
    expect(moveResource(collection, 'a', -1)).toBe(collection)
    expect(moveResource(collection, 'c', 1)).toBe(collection)
  })

  it('throws when the resource is unknown', () => {
    expect(() => moveResource(collection, 'missing', 1)).toThrow(/was not found/)
  })
})

describe('duplicateCollection', () => {
  it('copies the collection with a new id and name', () => {
    const original = {
      ...createCollection('History', 'A reading list', 'collection-1'),
      resources: [{ id: 'a', title: 'A', language: 'en' }],
    }
    const copy = duplicateCollection(original, 'collection-2')

    expect(copy.id).toBe('collection-2')
    expect(copy.name).toBe('History (copy)')
    expect(copy.resources).toEqual(original.resources)
    expect(copy.resources[0]).not.toBe(original.resources[0])
    expect(original.name).toBe('History')
  })
})

describe('collectionToManifest', () => {
  it('adds the schema version to a collection', () => {
    const collection = {
      ...createCollection('History', 'A reading list', 'collection-1'),
      resources: [{ id: 'a', title: 'A', language: 'en' }],
    }
    expect(collectionToManifest(collection)).toEqual({
      schemaVersion: 1,
      id: 'collection-1',
      name: 'History',
      description: 'A reading list',
      createdAt: collection.createdAt,
      resources: [{ id: 'a', title: 'A', language: 'en' }],
    })
  })
})

describe('resourceFromZimFile', () => {
  const header = {
    uuid: 'aaaa1111-2222-3333-4444-555566667777',
    articleCount: 12,
    clusterCount: 3,
    majorVersion: 5,
    minorVersion: 1,
  }

  it('derives metadata from a ZIM file', () => {
    const file = { name: 'wikipedia_en_all.zim', size: 4096 } as File
    const resource = resourceFromZimFile(file, header)
    expect(resource).toEqual({
      id: 'zim-aaaa1111-2222-3333-4444-555566667777',
      title: 'wikipedia_en_all',
      language: 'en',
      description: undefined,
      sizeBytes: 4096,
      filename: 'wikipedia_en_all.zim',
      zimUuid: 'aaaa1111-2222-3333-4444-555566667777',
      sourceUrl: undefined,
      sha256: undefined,
    })
  })

  it('honours explicit overrides', () => {
    const file = { name: 'archive.zim', size: 100 } as File
    const resource = resourceFromZimFile(file, header, {
      title: 'Custom title',
      language: 'fr',
      description: 'A description',
      sourceUrl: 'https://example.test/archive',
    })
    expect(resource.title).toBe('Custom title')
    expect(resource.language).toBe('fr')
    expect(resource.description).toBe('A description')
    expect(resource.sourceUrl).toBe('https://example.test/archive')
  })

  it('falls back to an undetermined language when the filename has none', () => {
    const file = { name: 'archive.zim', size: 100 } as File
    expect(resourceFromZimFile(file, header).language).toBe('und')
  })
})
