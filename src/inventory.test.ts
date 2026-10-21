import { describe, expect, it } from 'vitest'
import {
  UNDETERMINED_LANGUAGE,
  formatBytes,
  inventoryEntryId,
  inventoryEntryToResource,
  mergeInventoryEntries,
  scanZimFile,
  titleFromFileName,
  type InventoryEntry,
} from './inventory'
import { ZIM_HEADER_SIZE, ZIM_MAGIC, type ZimHeader } from './zim'

// Build a synthetic ZIM file: an 80-byte header followed by a 16-byte
// checksum, which is the layout every real archive uses.
function buildZimFile(name: string, overrides: Partial<ZimHeader> = {}): File {
  const buffer = new ArrayBuffer(ZIM_HEADER_SIZE + 16)
  const view = new DataView(buffer)
  view.setUint32(0, overrides.magicNumber ?? ZIM_MAGIC, true)
  view.setUint16(4, overrides.majorVersion ?? 5, true)
  view.setUint16(6, overrides.minorVersion ?? 1, true)
  const uuid = overrides.uuid ?? '01234567-89ab-cdef-0123-456789abcdef'
  const hex = uuid.replace(/-/g, '')
  for (let i = 0; i < 16; i += 1) {
    view.setUint8(8 + i, Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16))
  }
  view.setUint32(24, overrides.articleCount ?? 12, true)
  view.setUint32(28, overrides.clusterCount ?? 3, true)
  view.setBigUint64(56, BigInt(ZIM_HEADER_SIZE), true)
  view.setBigUint64(72, BigInt(1024), true)

  const bytes = new Uint8Array(buffer)
  bytes.set([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03, 0x04], ZIM_HEADER_SIZE)

  return new File([buffer], name)
}

describe('scanZimFile', () => {
  it('reads the metadata of a ZIM file', async () => {
    const entry = await scanZimFile(buildZimFile('wikipedia_en_all.zim'))

    expect(entry.id).toBe('zim-01234567-89ab-cdef-0123-456789abcdef')
    expect(entry.zimUuid).toBe('01234567-89ab-cdef-0123-456789abcdef')
    expect(entry.fileName).toBe('wikipedia_en_all.zim')
    expect(entry.title).toBe('wikipedia_en_all')
    expect(entry.language).toBe('en')
    expect(entry.version).toBe('5.1')
    expect(entry.articleCount).toBe(12)
    expect(entry.clusterCount).toBe(3)
    expect(entry.sizeBytes).toBe(ZIM_HEADER_SIZE + 16)
    expect(entry.checksum).toBe('deadbeef010203040000000000000000')
  })

  it('falls back to an undetermined language when the filename has none', async () => {
    const entry = await scanZimFile(buildZimFile('archive.zim'))
    expect(entry.language).toBe(UNDETERMINED_LANGUAGE)
  })

  it('rejects a file that is not a ZIM archive', async () => {
    const file = new File([new Uint8Array(128)], 'notes.txt')
    await expect(scanZimFile(file)).rejects.toThrow(/magic number/)
  })

  it('rejects a file that is too small to hold a header', async () => {
    const file = new File([new Uint8Array(10)], 'tiny.zim')
    await expect(scanZimFile(file)).rejects.toThrow(/too small/)
  })
})

describe('mergeInventoryEntries', () => {
  const entry = (overrides: Partial<InventoryEntry>): InventoryEntry => ({
    id: 'zim-1',
    fileName: 'a.zim',
    sizeBytes: 100,
    zimUuid: 'uuid-1',
    version: '5.1',
    majorVersion: 5,
    minorVersion: 1,
    articleCount: 1,
    clusterCount: 1,
    title: 'a',
    language: 'en',
    description: '',
    sourceUrl: '',
    checksum: null,
    addedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  })

  it('appends new archives', () => {
    const merged = mergeInventoryEntries(
      [entry({})],
      [entry({ id: 'zim-2', zimUuid: 'uuid-2', addedAt: '2026-02-02T00:00:00.000Z' })],
    )
    expect(merged.map((item) => item.zimUuid)).toEqual(['uuid-1', 'uuid-2'])
  })

  it('refreshes a known archive but keeps its first-seen date', () => {
    const merged = mergeInventoryEntries(
      [entry({ title: 'old title', addedAt: '2026-01-01T00:00:00.000Z' })],
      [entry({ title: 'new title', sizeBytes: 200, addedAt: '2026-02-02T00:00:00.000Z' })],
    )
    expect(merged).toHaveLength(1)
    expect(merged[0].title).toBe('new title')
    expect(merged[0].sizeBytes).toBe(200)
    expect(merged[0].addedAt).toBe('2026-01-01T00:00:00.000Z')
  })

  it('keeps entries that are not part of the new scan', () => {
    const merged = mergeInventoryEntries([entry({})], [])
    expect(merged).toHaveLength(1)
  })
})

describe('inventoryEntryToResource', () => {
  it('maps an inventory entry to a collection resource', () => {
    const resource = inventoryEntryToResource({
      id: 'zim-uuid-1',
      fileName: 'history_en.zim',
      sizeBytes: 4096,
      zimUuid: 'uuid-1',
      version: '6.1',
      majorVersion: 6,
      minorVersion: 1,
      articleCount: 10,
      clusterCount: 2,
      title: 'History',
      language: 'en',
      description: 'A history archive',
      sourceUrl: 'https://example.test/history.zim',
      checksum: 'abc',
      addedAt: '2026-01-01T00:00:00.000Z',
    })

    expect(resource).toEqual({
      id: 'zim-uuid-1',
      title: 'History',
      language: 'en',
      description: 'A history archive',
      sizeBytes: 4096,
      filename: 'history_en.zim',
      zimUuid: 'uuid-1',
      zimVersion: '6.1',
      zimChecksum: 'abc',
      sourceUrl: 'https://example.test/history.zim',
    })
  })

  it('omits empty optional fields and never produces an empty language', () => {
    const resource = inventoryEntryToResource({
      id: 'zim-uuid-2',
      fileName: 'archive.zim',
      sizeBytes: 10,
      zimUuid: 'uuid-2',
      version: '5.1',
      majorVersion: 5,
      minorVersion: 1,
      articleCount: 1,
      clusterCount: 1,
      title: 'archive',
      language: '',
      description: '',
      sourceUrl: '',
      checksum: null,
      addedAt: '2026-01-01T00:00:00.000Z',
    })

    expect(resource.language).toBe(UNDETERMINED_LANGUAGE)
    expect('description' in resource).toBe(false)
    expect('sourceUrl' in resource).toBe(false)
    expect('zimChecksum' in resource).toBe(false)
    expect(resource.zimVersion).toBe('5.1')
  })
})

describe('helpers', () => {
  it('derives a stable resource id from the ZIM uuid', () => {
    expect(inventoryEntryId('01234567-89ab-cdef-0123-456789abcdef')).toBe(
      'zim-01234567-89ab-cdef-0123-456789abcdef',
    )
  })

  it('strips the .zim extension from a title', () => {
    expect(titleFromFileName('wikipedia_en_all.zim')).toBe('wikipedia_en_all')
    expect(titleFromFileName('wikipedia_en_all.ZIM')).toBe('wikipedia_en_all')
  })

  it('formats byte sizes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB')
    expect(formatBytes(-1)).toBe('—')
  })
})
