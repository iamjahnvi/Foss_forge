// ZIM file format header parsing (openZIM specification).
// https://openzim.org/wiki/ZIM_file_format_old_namespace
//
// A ZIM file begins with an 80-byte header. All integers are unsigned and
// little-endian. The header exposes enough to identify a file and to populate
// a collection resource without decompressing any content clusters: the file's
// unique UUID, its format version, and how many articles it contains.
//
// This module reads only the first 80 bytes, so it stays cheap even when
// scanning folders full of multi-gigabyte archives.

export const ZIM_HEADER_SIZE = 80

// Magic number stored as a little-endian uint32 at offset 0. The value is
// 72173914 (0x044D495A), so the bytes on disk are 0x5A 0x49 0x4D 0x04: the
// ASCII text "ZIM" followed by a format identifier byte.
export const ZIM_MAGIC = 0x044d495a

export const ZIM_CHECKSUM_SIZE = 16

export type ZimHeader = {
  magicNumber: number
  majorVersion: number
  minorVersion: number
  uuid: string
  articleCount: number
  clusterCount: number
  urlPtrPos: number
  titlePtrPos: number
  clusterPtrPos: number
  mimeListPos: number
  mainPage: number
  layoutPage: number
  checksumPos: number
}

export type ZimInventoryEntry = {
  name: string
  path: string
  sizeBytes: number
  header: ZimHeader
}

function formatZimUuid(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new Error(`ZIM UUID must be 16 bytes, received ${bytes.length}.`)
  }
  const hex = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function isZimMagic(view: DataView): boolean {
  if (view.getUint32(0, true) === ZIM_MAGIC) return true
  // Accept the "ZIM" ASCII prefix as well, so a file that declares a newer
  // format identifier byte is still recognised instead of being rejected.
  return view.getUint8(0) === 0x5a && view.getUint8(1) === 0x49 && view.getUint8(2) === 0x4d
}

export function readZimHeader(buffer: ArrayBuffer): ZimHeader {
  if (buffer.byteLength < ZIM_HEADER_SIZE) {
    throw new Error(
      `File is too small to be a ZIM archive (${buffer.byteLength} bytes; need at least ${ZIM_HEADER_SIZE}).`,
    )
  }

  const view = new DataView(buffer)
  if (!isZimMagic(view)) {
    throw new Error('Not a ZIM file: the magic number does not match.')
  }

  const mimeListPos = Number(view.getBigUint64(56, true))
  if (mimeListPos < ZIM_HEADER_SIZE) {
    throw new Error(
      `Invalid ZIM header: MIME list offset ${mimeListPos} is smaller than the 80-byte header.`,
    )
  }

  return {
    magicNumber: view.getUint32(0, true),
    majorVersion: view.getUint16(4, true),
    minorVersion: view.getUint16(6, true),
    uuid: formatZimUuid(new Uint8Array(buffer.slice(8, 24))),
    articleCount: view.getUint32(24, true),
    clusterCount: view.getUint32(28, true),
    urlPtrPos: Number(view.getBigUint64(32, true)),
    titlePtrPos: Number(view.getBigUint64(40, true)),
    clusterPtrPos: Number(view.getBigUint64(48, true)),
    mimeListPos,
    mainPage: view.getUint32(64, true),
    layoutPage: view.getUint32(68, true),
    checksumPos: Number(view.getBigUint64(72, true)),
  }
}

export async function readZimHeaderFromFile(file: Blob): Promise<ZimHeader> {
  // Only the first 80 bytes are needed, which keeps scans of huge archives fast.
  const buffer = await file.slice(0, ZIM_HEADER_SIZE).arrayBuffer()
  return readZimHeader(buffer)
}

// The ZIM checksum is the MD5 of the archive without its own 16 checksum
// bytes, and it always sits at the very end of the file. Reading it costs a
// single tail read, so it is a cheap integrity signal for the local inventory.
export async function readZimChecksum(file: Blob): Promise<string | null> {
  if (file.size < ZIM_HEADER_SIZE + ZIM_CHECKSUM_SIZE) return null
  const buffer = await file.slice(file.size - ZIM_CHECKSUM_SIZE).arrayBuffer()
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

// Kiwix ZIM filenames frequently embed a two-letter language code, for example
// "wikipedia_en_all.zim" or "wikipedia_fr_village.zim". This best-effort guess
// pre-fills the resource's language field; it can always be edited.
export function guessLanguage(filename: string): string {
  const match = /[_\-.]([a-z]{2})[_\-.]/.exec(filename.toLowerCase())
  return match ? match[1] : ''
}

export function isZimFileName(filename: string): boolean {
  return /\.zim$/i.test(filename)
}

export function formatZimVersion(header: {
  majorVersion: number
  minorVersion: number
}): string {
  return `${header.majorVersion}.${header.minorVersion}`
}

// ZIM format versions this app knows how to read. An archive with a newer
// major version is reported as unknown instead of being silently accepted:
// the header layout may have changed in ways the app cannot interpret.
export const SUPPORTED_ZIM_MAJOR_VERSIONS = [5, 6]

export function isSupportedZimVersion(majorVersion: number): boolean {
  return SUPPORTED_ZIM_MAJOR_VERSIONS.includes(majorVersion)
}
