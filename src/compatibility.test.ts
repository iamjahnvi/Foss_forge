// Test evidence for the compatibility engine: every outcome the flow diagram
// asks for is covered, including the rule that a filename alone never makes a
// match.

import { describe, expect, it } from 'vitest'
import {
  buildCompatibilityReport,
  compatibilityLabel,
  matchManifestToInventory,
  matchResource,
} from './compatibility'
import type { InventoryEntry } from './inventory'
import type { CollectionManifest, CollectionResource } from './manifest'

const ZIM_UUID = '01234567-89ab-cdef-0123-456789abcdef'
const OTHER_UUID = 'fedcba98-7654-3210-fedc-ba9876543210'

function resource(overrides: Partial<CollectionResource> = {}): CollectionResource {
  return {
    id: 'resource-1',
    title: 'Wikipedia (EN)',
    language: 'en',
    ...overrides,
  }
}

function inventoryEntry(overrides: Partial<InventoryEntry> = {}): InventoryEntry {
  return {
    id: `zim-${ZIM_UUID}`,
    fileName: 'wikipedia_en_all.zim',
    sizeBytes: 1024,
    zimUuid: ZIM_UUID,
    version: '6.1',
    majorVersion: 6,
    minorVersion: 1,
    articleCount: 42,
    clusterCount: 7,
    title: 'wikipedia_en_all',
    language: 'en',
    description: '',
    sourceUrl: '',
    checksum: 'a'.repeat(32),
    addedAt: '2026-10-21T10:00:00.000Z',
    ...overrides,
  }
}

describe('compatibility engine', () => {
  it('matches an archive by ZIM identity, version and checksum', () => {
    const result = matchResource(
      resource({ zimUuid: ZIM_UUID, zimVersion: '6.1', zimChecksum: 'a'.repeat(32) }),
      [inventoryEntry()],
    )

    expect(result.status).toBe('present')
    expect(result.verified).toBe(true)
    expect(result.localFileName).toBe('wikipedia_en_all.zim')
    expect(compatibilityLabel(result)).toBe('Present & verified')
  })

  it('reports a resource whose archive is not on this machine as missing', () => {
    const result = matchResource(resource({ zimUuid: ZIM_UUID }), [])

    expect(result.status).toBe('missing')
    expect(result.verified).toBe(false)
    expect(result.localFileName).toBeNull()
    expect(compatibilityLabel(result)).toBe('Missing')
  })

  it('reports a different ZIM format version', () => {
    const result = matchResource(
      resource({ zimUuid: ZIM_UUID, zimVersion: '6.2' }),
      [inventoryEntry({ version: '6.1' })],
    )

    expect(result.status).toBe('different-version')
    expect(result.localVersion).toBe('6.1')
    expect(result.expectedVersion).toBe('6.2')
  })

  it('reports an integrity mismatch when the checksums differ', () => {
    const result = matchResource(
      resource({ zimUuid: ZIM_UUID, zimVersion: '6.1', zimChecksum: 'b'.repeat(32) }),
      [inventoryEntry({ checksum: 'a'.repeat(32) })],
    )

    expect(result.status).toBe('integrity-mismatch')
    expect(result.verified).toBe(false)
    expect(result.expectedChecksum).toBe('b'.repeat(32))
    expect(result.localChecksum).toBe('a'.repeat(32))
  })

  it('reports a resource without a ZIM identity as unknown', () => {
    const result = matchResource(
      resource({ filename: 'wikipedia_en_all.zim' }),
      [inventoryEntry()],
    )

    expect(result.status).toBe('unknown')
    expect(result.verified).toBe(false)
  })

  it('never matches on the filename alone', () => {
    const result = matchResource(
      resource({ filename: 'wikipedia_en_all.zim', zimUuid: OTHER_UUID }),
      [inventoryEntry()],
    )

    expect(result.status).toBe('missing')
    expect(result.localFileName).toBeNull()
  })

  it('matches the ZIM UUID regardless of letter case', () => {
    const result = matchResource(
      resource({ zimUuid: ZIM_UUID.toUpperCase() }),
      [inventoryEntry({ zimUuid: ZIM_UUID.toLowerCase() })],
    )

    expect(result.status).toBe('present')
  })

  it('matches the checksum regardless of letter case', () => {
    const result = matchResource(
      resource({ zimUuid: ZIM_UUID, zimChecksum: 'A'.repeat(32) }),
      [inventoryEntry({ checksum: 'a'.repeat(32) })],
    )

    expect(result.status).toBe('present')
    expect(result.verified).toBe(true)
  })

  it('treats "6" and "6.0" as the same format version', () => {
    const result = matchResource(
      resource({ zimUuid: ZIM_UUID, zimVersion: '6' }),
      [inventoryEntry({ version: '6.0' })],
    )

    expect(result.status).toBe('present')
  })

  it('reports a local archive as present but unverified when its checksum cannot be read', () => {
    const result = matchResource(
      resource({ zimUuid: ZIM_UUID, zimChecksum: 'a'.repeat(32) }),
      [inventoryEntry({ checksum: null })],
    )

    expect(result.status).toBe('present')
    expect(result.verified).toBe(false)
    expect(compatibilityLabel(result)).toBe('Present (unverified)')
  })

  it('reports a local archive in an unsupported format version as unknown', () => {
    const result = matchResource(
      resource({ zimUuid: ZIM_UUID }),
      [inventoryEntry({ version: '7.0', majorVersion: 7, minorVersion: 0 })],
    )

    expect(result.status).toBe('unknown')
  })

  it('prefers the local copy whose checksum matches when several copies share a ZIM identity', () => {
    const result = matchResource(
      resource({ zimUuid: ZIM_UUID, zimChecksum: 'c'.repeat(32) }),
      [
        inventoryEntry({ fileName: 'stale_copy.zim', checksum: 'a'.repeat(32) }),
        inventoryEntry({ fileName: 'good_copy.zim', checksum: 'c'.repeat(32) }),
      ],
    )

    expect(result.status).toBe('present')
    expect(result.verified).toBe(true)
    expect(result.localFileName).toBe('good_copy.zim')
  })

  it('matches a version 1 resource, which records no version and no checksum, by identity', () => {
    const result = matchResource(resource({ zimUuid: ZIM_UUID }), [inventoryEntry()])

    expect(result.status).toBe('present')
    expect(result.verified).toBe(true)
    expect(result.detail).toMatch(/no checksum/i)
  })

  it('ignores the manifest SHA-256, which cannot be compared with the archive checksum', () => {
    const result = matchResource(
      resource({ zimUuid: ZIM_UUID, sha256: 'f'.repeat(64) }),
      [inventoryEntry()],
    )

    expect(result.status).toBe('present')
  })
})

describe('compatibility report', () => {
  it('summarises the outcomes of a collection', () => {
    const report = buildCompatibilityReport(
      [
        resource({ id: 'present', zimUuid: ZIM_UUID, zimChecksum: 'a'.repeat(32) }),
        resource({ id: 'missing', zimUuid: OTHER_UUID }),
        resource({ id: 'version', zimUuid: ZIM_UUID, zimVersion: '6.2' }),
        resource({ id: 'mismatch', zimUuid: ZIM_UUID, zimChecksum: 'b'.repeat(32) }),
        resource({ id: 'unknown' }),
      ],
      [inventoryEntry()],
    )

    expect(report.total).toBe(5)
    expect(report.summary).toEqual({
      present: 1,
      missing: 1,
      'different-version': 1,
      'integrity-mismatch': 1,
      unknown: 1,
    })
    expect(report.presentCount).toBe(1)
    expect(report.missingCount).toBe(1)
    expect(report.fullyAvailable).toBe(false)
  })

  it('reports a collection as fully available when every archive is present', () => {
    const report = buildCompatibilityReport(
      [
        resource({ id: 'first', zimUuid: ZIM_UUID, zimChecksum: 'a'.repeat(32) }),
        resource({ id: 'second', zimUuid: OTHER_UUID }),
      ],
      [inventoryEntry(), inventoryEntry({ id: `zim-${OTHER_UUID}`, zimUuid: OTHER_UUID })],
    )

    expect(report.fullyAvailable).toBe(true)
    expect(report.summary.present).toBe(2)
  })

  it('matches a whole manifest against the inventory', () => {
    const manifest: CollectionManifest = {
      schemaVersion: 2,
      id: 'collection-1',
      name: 'Offline set',
      description: '',
      createdAt: '2026-10-21T10:00:00Z',
      resources: [resource({ zimUuid: ZIM_UUID, zimChecksum: 'a'.repeat(32) })],
    }

    const report = matchManifestToInventory(manifest, [inventoryEntry()])

    expect(report.entries).toHaveLength(1)
    expect(report.entries[0].status).toBe('present')
  })

  it('reports an empty collection as not fully available', () => {
    expect(buildCompatibilityReport([], [inventoryEntry()]).fullyAvailable).toBe(false)
  })
})
