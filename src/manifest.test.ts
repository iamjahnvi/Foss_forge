import { describe, expect, it } from 'vitest'
import { addImportedCollection, type Collection } from './collections'
import {
  manifestFilename,
  parseManifest,
  serializeManifest,
  CURRENT_SCHEMA_VERSION,
  type CollectionManifest,
} from './manifest'

const validManifest: CollectionManifest = {
  schemaVersion: 2,
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
      zimVersion: '6.1',
      zimChecksum: 'a'.repeat(32),
      sourceUrl: 'https://catalogue.example.test/history',
      sha256: 'a'.repeat(64),
    },
  ],
}

describe('Kiwix Collections project manifests', () => {
  it('accepts a valid version 2 manifest', () => {
    expect(parseManifest(JSON.stringify(validManifest))).toEqual(validManifest)
  })

  it('accepts a version 1 manifest', () => {
    const version1 = { ...validManifest, schemaVersion: 1 }
    expect(parseManifest(JSON.stringify(version1))).toEqual(version1)
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
    const unsupported = { ...validManifest, schemaVersion: 3 }
    expect(() => parseManifest(JSON.stringify(unsupported))).toThrow(
      /supports versions 1 and 2/,
    )
  })

  it('rejects malformed ZIM versions and checksums', () => {
    const invalidVersion = structuredClone(validManifest)
    invalidVersion.resources[0].zimVersion = 'six'
    expect(() => parseManifest(JSON.stringify(invalidVersion))).toThrow(/pattern/)

    const invalidChecksum = structuredClone(validManifest)
    invalidChecksum.resources[0].zimChecksum = 'not-a-checksum'
    expect(() => parseManifest(JSON.stringify(invalidChecksum))).toThrow(/pattern/)
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

  it('survives an export and import round trip', () => {
    const exported = serializeManifest(validManifest)
    expect(exported.endsWith('\n')).toBe(true)
    expect(parseManifest(exported)).toEqual(validManifest)
  })

  it('round trips a collection that was built from the local inventory', () => {
    const collection = addImportedCollection(validManifest, [])
    const exported = serializeManifest({ schemaVersion: CURRENT_SCHEMA_VERSION, ...collection })
    const imported = parseManifest(exported)

    expect(imported.resources[0].zimUuid).toBe('zim-uuid')
    expect(imported.resources[0].zimVersion).toBe('6.1')
    expect(imported.resources[0].zimChecksum).toBe('a'.repeat(32))
    expect(imported.resources[0].sha256).toBe('a'.repeat(64))
  })
})
