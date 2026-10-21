// Local inventory of ZIM archives.
//
// The inventory is the catalogue of offline archives the user has on their own
// machine. Nothing is uploaded: the browser reads the 80-byte ZIM header of
// the files the user picks, and the app keeps the resulting metadata locally.

import type { CollectionResource } from './manifest'
import { formatZimVersion, guessLanguage, readZimChecksum, readZimHeaderFromFile } from './zim'

// The manifest schema requires a non-empty language code. "und" is the ISO
// 639-3 code for an undetermined language.
export const UNDETERMINED_LANGUAGE = 'und'

export type InventoryEntry = {
  id: string
  fileName: string
  sizeBytes: number
  zimUuid: string
  version: string
  majorVersion: number
  minorVersion: number
  articleCount: number
  clusterCount: number
  title: string
  language: string
  description: string
  sourceUrl: string
  checksum: string | null
  addedAt: string
}

export function inventoryEntryId(zimUuid: string): string {
  return `zim-${zimUuid}`
}

export function titleFromFileName(fileName: string): string {
  return fileName.replace(/\.zim$/i, '')
}

// Reads the header of a ZIM file the user selected. Only the first 80 bytes
// and the trailing checksum are read, so this stays fast for large archives.
export async function scanZimFile(file: File): Promise<InventoryEntry> {
  const header = await readZimHeaderFromFile(file)
  const checksum = await readZimChecksum(file)

  return {
    id: inventoryEntryId(header.uuid),
    fileName: file.name,
    sizeBytes: file.size,
    zimUuid: header.uuid,
    version: formatZimVersion(header),
    majorVersion: header.majorVersion,
    minorVersion: header.minorVersion,
    articleCount: header.articleCount,
    clusterCount: header.clusterCount,
    title: titleFromFileName(file.name),
    language: guessLanguage(file.name) || UNDETERMINED_LANGUAGE,
    description: '',
    sourceUrl: '',
    checksum,
    addedAt: new Date().toISOString(),
  }
}

// Adds freshly scanned archives to the inventory. An archive that is already
// known is refreshed with the new file's metadata, but keeps the date it was
// first added.
export function mergeInventoryEntries(
  existing: InventoryEntry[],
  incoming: InventoryEntry[],
): InventoryEntry[] {
  const merged = new Map(existing.map((entry) => [entry.zimUuid, entry]))

  for (const entry of incoming) {
    const previous = merged.get(entry.zimUuid)
    merged.set(entry.zimUuid, previous ? { ...entry, addedAt: previous.addedAt } : entry)
  }

  return [...merged.values()]
}

export function inventoryEntryToResource(entry: InventoryEntry): CollectionResource {
  const resource: CollectionResource = {
    id: entry.id,
    title: entry.title,
    language: entry.language || UNDETERMINED_LANGUAGE,
    sizeBytes: entry.sizeBytes,
    filename: entry.fileName,
    zimUuid: entry.zimUuid,
  }
  if (entry.description) resource.description = entry.description
  if (entry.sourceUrl) resource.sourceUrl = entry.sourceUrl
  return resource
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`
}
