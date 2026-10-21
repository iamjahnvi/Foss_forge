import { describe, expect, it } from 'vitest'
import {
  ZIM_HEADER_SIZE,
  ZIM_MAGIC,
  formatZimVersion,
  guessLanguage,
  isZimFileName,
  readZimChecksum,
  readZimHeader,
  type ZimHeader,
} from './zim'

// Build a synthetic 80-byte ZIM header buffer from partial fields so the tests
// exercise the real parser without depending on a real .zim file.
function buildHeader(overrides: Partial<ZimHeader> = {}): ArrayBuffer {
  const buffer = new ArrayBuffer(ZIM_HEADER_SIZE)
  const view = new DataView(buffer)
  view.setUint32(0, overrides.magicNumber ?? ZIM_MAGIC, true)
  view.setUint16(4, overrides.majorVersion ?? 5, true)
  view.setUint16(6, overrides.minorVersion ?? 1, true)
  // UUID bytes 8..24 default to a fixed pattern.
  const uuid = overrides.uuid ?? '01234567-89ab-cdef-0123-456789abcdef'
  const hex = uuid.replace(/-/g, '')
  for (let i = 0; i < 16; i += 1) {
    view.setUint8(8 + i, Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16))
  }
  view.setUint32(24, overrides.articleCount ?? 12, true)
  view.setUint32(28, overrides.clusterCount ?? 3, true)
  view.setBigUint64(32, BigInt(overrides.urlPtrPos ?? 200), true)
  view.setBigUint64(40, BigInt(overrides.titlePtrPos ?? 300), true)
  view.setBigUint64(48, BigInt(overrides.clusterPtrPos ?? 400), true)
  view.setBigUint64(56, BigInt(overrides.mimeListPos ?? ZIM_HEADER_SIZE), true)
  view.setUint32(64, overrides.mainPage ?? 0xffffffff, true)
  view.setUint32(68, overrides.layoutPage ?? 0xffffffff, true)
  view.setBigUint64(72, BigInt(overrides.checksumPos ?? 900), true)
  return buffer
}

describe('ZIM header parsing', () => {
  it('parses a valid v5.1 header', () => {
    const header = readZimHeader(buildHeader())
    expect(header).toEqual({
      magicNumber: ZIM_MAGIC,
      majorVersion: 5,
      minorVersion: 1,
      uuid: '01234567-89ab-cdef-0123-456789abcdef',
      articleCount: 12,
      clusterCount: 3,
      urlPtrPos: 200,
      titlePtrPos: 300,
      clusterPtrPos: 400,
      mimeListPos: ZIM_HEADER_SIZE,
      mainPage: 0xffffffff,
      layoutPage: 0xffffffff,
      checksumPos: 900,
    })
  })

  it('uses the magic number defined by the openZIM specification', () => {
    expect(ZIM_MAGIC).toBe(72173914)
  })

  it('recognises the "ZIM" file prefix of a real archive', () => {
    const buffer = buildHeader()
    const view = new DataView(buffer)
    // A real archive stores the bytes 0x5A 0x49 0x4D 0x04, which read back as
    // a little-endian uint32 is the specification's magic number.
    expect(Array.from(new Uint8Array(buffer, 0, 4))).toEqual([0x5a, 0x49, 0x4d, 0x04])
    expect(view.getUint32(0, true)).toBe(72173914)
    expect(readZimHeader(buffer).magicNumber).toBe(72173914)
  })

  it('formats the version string', () => {
    expect(formatZimVersion(readZimHeader(buildHeader({ majorVersion: 6, minorVersion: 3 })))).toBe(
      '6.3',
    )
  })

  it('rejects files smaller than the 80-byte header', () => {
    expect(() => readZimHeader(new ArrayBuffer(16))).toThrow(/too small/)
  })

  it('rejects files with the wrong magic number', () => {
    const buffer = buildHeader({ magicNumber: 0xdeadbeef })
    expect(() => readZimHeader(buffer)).toThrow(/magic number/)
  })

  it('rejects a header whose MIME list offset is too small', () => {
    const buffer = buildHeader({ mimeListPos: 40 })
    expect(() => readZimHeader(buffer)).toThrow(/MIME list offset/)
  })

  it('reads the UUID in canonical hyphenated form', () => {
    const header = readZimHeader(
      buildHeader({ uuid: 'abcdef01-1234-5678-9abc-def012345678' }),
    )
    expect(header.uuid).toBe('abcdef01-1234-5678-9abc-def012345678')
  })

  it('reads article and cluster counts', () => {
    const header = readZimHeader(buildHeader({ articleCount: 0, clusterCount: 0 }))
    expect(header.articleCount).toBe(0)
    expect(header.clusterCount).toBe(0)
  })

  it('reads 64-bit structure offsets', () => {
    const header = readZimHeader(
      buildHeader({ urlPtrPos: 1024, clusterPtrPos: 4096, checksumPos: 8192 }),
    )
    expect(header.urlPtrPos).toBe(1024)
    expect(header.clusterPtrPos).toBe(4096)
    expect(header.checksumPos).toBe(8192)
  })
})

describe('ZIM checksum', () => {
  it('reads the trailing 16 bytes as hex', async () => {
    const bytes = new Uint8Array(128)
    bytes.set([0xde, 0xad, 0xbe, 0xef], 112)
    const file = new Blob([bytes])
    await expect(readZimChecksum(file)).resolves.toBe('deadbeef000000000000000000000000')
  })

  it('returns null for a file that is too small to hold a checksum', async () => {
    await expect(readZimChecksum(new Blob([new Uint8Array(10)]))).resolves.toBeNull()
  })
})

describe('ZIM filename helpers', () => {
  it('recognises .zim files case-insensitively', () => {
    expect(isZimFileName('wikipedia_en_all.zim')).toBe(true)
    expect(isZimFileName('WIKIPEDIA.ZIM')).toBe(true)
    expect(isZimFileName('notes.txt')).toBe(false)
  })

  it('guesses a language code from a Kiwix filename', () => {
    expect(guessLanguage('wikipedia_en_all.zim')).toBe('en')
    expect(guessLanguage('wikipedia_fr_village.zim')).toBe('fr')
    expect(guessLanguage('archive.zim')).toBe('')
  })
})
