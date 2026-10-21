import { describe, expect, it } from 'vitest'
import { addImportedCollection, type Collection } from './collections'
import {
  manifestFilename,
  parseManifest,
  serializeManifest,
  type CollectionManifest,
} from './manifest'

const validManifest: CollectionManifest = {
  schemaVersion: 1,
  id: 'collection-1',
  name: 'World history',
  description: 'A small reference collection.',
  createdAt: '2026-10-21T10:00:00Z',
  resources: [
    {
      id: 'resource-1',
      title: 'History encyclopedia',
      language: 'en',
      sizeBytes: 1024,
      filename: 'history_en.zim',
      zimUuid: 'zim-uuid',
      sourceUrl: 'https://catalogue.example.test/history',
      sha256: 'a'.repeat(64),
    },
  ],
}

describe('Kiwix Collections project manifests', () => {
  it('accepts a valid version 1 manifest', () => {
    expect(parseManifest(JSON.stringify(validManifest))).toEqual(validManifest)
  })

  it('reports missing required fields and invalid types', () => {
    expect(() => parseManifest(JSON.stringify({ schemaVersion: 1 }))).toThrow(
      /missing required field/,
    )

    const invalid = {
      ...validManifest,
      name: 42,
    }
    expect(() => parseManifest(JSON.stringify(invalid))).toThrow(/name must be string/)
  })

  it('rejects negative sizes and malformed SHA-256 checksums', () => {
    const negativeSize = structuredClone(validManifest)
    negativeSize.resources[0].sizeBytes = -1
    expect(() => parseManifest(JSON.stringify(negativeSize))).toThrow(/>= 0/)

    const invalidChecksum = structuredClone(validManifest)
    invalidChecksum.resources[0].sha256 = 'not-a-checksum'
    expect(() => parseManifest(JSON.stringify(invalidChecksum))).toThrow(/pattern/)
  })

  it('rejects invalid timestamps', () => {
    const invalidTimestamp = { ...validManifest, createdAt: '2026-02-30T12:00:00Z' }
    expect(() => parseManifest(JSON.stringify(invalidTimestamp))).toThrow(/date-time/)
  })

  it('rejects unsupported schema versions', () => {
    const unsupported = { ...validManifest, schemaVersion: 2 }
    expect(() => parseManifest(JSON.stringify(unsupported))).toThrow(
      /supports version 1/,
    )
  })

  it('preserves metadata through export and import', () => {
    expect(parseManifest(serializeManifest(validManifest))).toEqual(validManifest)
  })

  it('reports malformed JSON', () => {
    expect(() => parseManifest('{"schemaVersion":')).toThrow(/not valid JSON/)
  })

  it('rejects duplicate resource IDs', () => {
    const duplicateResources = {
      ...validManifest,
      resources: [...validManifest.resources, { ...validManifest.resources[0] }],
    }
    expect(() => parseManifest(JSON.stringify(duplicateResources))).toThrow(
      /duplicate resource ID "resource-1"/,
    )
  })

  it('assigns a new collection ID on conflict and preserves resource metadata', () => {
    const existing: Collection[] = [
      {
        id: validManifest.id,
        name: 'Existing',
        description: '',
        createdAt: validManifest.createdAt,
        resources: [],
      },
    ]

    expect(addImportedCollection(validManifest, existing, () => 'imported-copy')).toEqual({
      ...validManifest,
      id: 'imported-copy',
    })
  })

  it('creates safe JSON filenames', () => {
    expect(manifestFilename('My collection: history?')).toBe('My-collection-history.json')
    expect(manifestFilename('CON')).toBe('collection-CON.json')
    expect(manifestFilename('CON.txt')).toBe('collection-CON.txt.json')
  })
})
