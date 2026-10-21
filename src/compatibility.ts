// Compatibility engine.
//
// A collection manifest describes the archives a reader is expected to have.
// The compatibility engine answers one question per resource: does the archive
// on this machine match the one the manifest describes?
//
// Archives are matched by their ZIM UUID first, then by their ZIM format
// version, then by the checksum stored inside the archive. The filename is
// never used to decide a match. A file called "wikipedia_en_all.zim" can hold
// a completely different snapshot, and two archives of the same content can
// carry different names, so a name match proves nothing.
//
// The outcomes are the ones the flow diagram asks for:
//   - present            the archive is on this machine
//   - missing            the archive is not on this machine
//   - different-version  the archive is here, but in another format version
//   - integrity-mismatch the archive is here, but its checksum differs
//   - unknown            the resource or the archive cannot be interpreted

import type { InventoryEntry } from './inventory'
import type { CollectionManifest, CollectionResource } from './manifest'
import { isSupportedZimVersion } from './zim'

export type CompatibilityStatus =
  | 'present'
  | 'missing'
  | 'different-version'
  | 'integrity-mismatch'
  | 'unknown'

export const COMPATIBILITY_STATUSES: CompatibilityStatus[] = [
  'present',
  'missing',
  'different-version',
  'integrity-mismatch',
  'unknown',
]

export type CompatibilityEntry = {
  resourceId: string
  title: string
  status: CompatibilityStatus
  // True when the local archive was matched and its checksum agreed with the
  // manifest, or when the manifest records no checksum to disagree with.
  verified: boolean
  localFileName: string | null
  localVersion: string | null
  expectedVersion: string | null
  expectedChecksum: string | null
  localChecksum: string | null
  detail: string
}

export type CompatibilitySummary = Record<CompatibilityStatus, number>

export type CompatibilityReport = {
  entries: CompatibilityEntry[]
  summary: CompatibilitySummary
  total: number
  presentCount: number
  missingCount: number
  // True when every resource of the collection is on this machine.
  fullyAvailable: boolean
}

export const COMPATIBILITY_LABELS: Record<CompatibilityStatus, string> = {
  present: 'Present & verified',
  missing: 'Missing',
  'different-version': 'Different version',
  'integrity-mismatch': 'Integrity mismatch',
  unknown: 'Unknown / incompatible',
}

export function compatibilityLabel(entry: CompatibilityEntry): string {
  if (entry.status === 'present' && !entry.verified) return 'Present (unverified)'
  return COMPATIBILITY_LABELS[entry.status]
}

function normalizeUuid(uuid: string): string {
  return uuid.trim().toLowerCase()
}

function normalizeChecksum(checksum: string): string {
  return checksum.trim().toLowerCase()
}

// "6" and "6.0" describe the same format version, so both are read as [6, 0].
function normalizeVersion(version: string): string {
  const parts = version
    .trim()
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0))

  while (parts.length < 2) parts.push(0)
  return parts.slice(0, 3).join('.')
}

function sameChecksum(left: string, right: string): boolean {
  return normalizeChecksum(left) === normalizeChecksum(right)
}

// Picks the local archive that belongs to a ZIM identity. When several copies
// share a UUID, the one whose checksum matches the manifest wins, so a stale
// copy does not hide a good one.
function findLocalArchive(
  uuid: string,
  expectedChecksum: string | null,
  inventory: InventoryEntry[],
): InventoryEntry | undefined {
  const candidates = inventory.filter((entry) => normalizeUuid(entry.zimUuid) === uuid)
  if (candidates.length <= 1) return candidates[0]

  if (expectedChecksum) {
    const matching = candidates.find(
      (entry) => entry.checksum && sameChecksum(entry.checksum, expectedChecksum),
    )
    if (matching) return matching
  }

  return candidates[0]
}

// Matches one manifest resource against the local inventory.
export function matchResource(
  resource: CollectionResource,
  inventory: InventoryEntry[],
): CompatibilityEntry {
  const expectedVersion = resource.zimVersion?.trim() || null
  const expectedChecksum = resource.zimChecksum ? normalizeChecksum(resource.zimChecksum) : null
  const base = {
    resourceId: resource.id,
    title: resource.title,
    expectedVersion,
    expectedChecksum,
    localFileName: null as string | null,
    localVersion: null as string | null,
    localChecksum: null as string | null,
  }

  const uuid = resource.zimUuid ? normalizeUuid(resource.zimUuid) : ''
  if (!uuid) {
    return {
      ...base,
      status: 'unknown',
      verified: false,
      detail:
        'The manifest records no ZIM identity for this resource, so it cannot be matched against a local archive.',
    }
  }

  const local = findLocalArchive(uuid, expectedChecksum, inventory)
  if (!local) {
    return {
      ...base,
      status: 'missing',
      verified: false,
      detail:
        'No local archive has this ZIM identity. The archive itself is not part of a collection and has to be obtained separately.',
    }
  }

  const withLocal = {
    ...base,
    localFileName: local.fileName,
    localVersion: local.version,
    localChecksum: local.checksum ? normalizeChecksum(local.checksum) : null,
  }

  if (!isSupportedZimVersion(local.majorVersion)) {
    return {
      ...withLocal,
      status: 'unknown',
      verified: false,
      detail: `The local archive uses ZIM format ${local.version}, which this app does not understand.`,
    }
  }

  if (expectedVersion && normalizeVersion(expectedVersion) !== normalizeVersion(local.version)) {
    return {
      ...withLocal,
      status: 'different-version',
      verified: false,
      detail: `The local archive is ZIM format ${local.version}, the manifest expects ${expectedVersion}.`,
    }
  }

  if (expectedChecksum) {
    if (!withLocal.localChecksum) {
      return {
        ...withLocal,
        status: 'present',
        verified: false,
        detail: `The local archive ${local.fileName} matches, but its checksum could not be read, so the copy cannot be verified.`,
      }
    }
    if (!sameChecksum(withLocal.localChecksum, expectedChecksum)) {
      return {
        ...withLocal,
        status: 'integrity-mismatch',
        verified: false,
        detail: `The local archive ${local.fileName} has a different checksum than the manifest records, so it is not the archive the manifest describes.`,
      }
    }
    return {
      ...withLocal,
      status: 'present',
      verified: true,
      detail: `The local archive ${local.fileName} matches the manifest and its checksum is verified.`,
    }
  }

  return {
    ...withLocal,
    status: 'present',
    verified: true,
    detail: `The local archive ${local.fileName} matches the manifest by ZIM identity; the manifest records no checksum to verify.`,
  }
}

// Matches every resource of a collection and summarises the result.
export function buildCompatibilityReport(
  resources: CollectionResource[],
  inventory: InventoryEntry[],
): CompatibilityReport {
  const entries = resources.map((resource) => matchResource(resource, inventory))

  const summary: CompatibilitySummary = {
    present: 0,
    missing: 0,
    'different-version': 0,
    'integrity-mismatch': 0,
    unknown: 0,
  }
  for (const entry of entries) {
    summary[entry.status] += 1
  }

  return {
    entries,
    summary,
    total: entries.length,
    presentCount: summary.present,
    missingCount: summary.missing,
    fullyAvailable: entries.length > 0 && entries.every((entry) => entry.status === 'present'),
  }
}

export function matchManifestToInventory(
  manifest: CollectionManifest,
  inventory: InventoryEntry[],
): CompatibilityReport {
  return buildCompatibilityReport(manifest.resources, inventory)
}
