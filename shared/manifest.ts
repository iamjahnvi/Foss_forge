import { Ajv } from 'ajv'
import manifestSchema from './manifest.schema.json' with { type: 'json' }

export type CollectionResource = {
  id: string
  title: string
  language: string
  description?: string
  sizeBytes?: number
  filename?: string
  zimUuid?: string
  sourceUrl?: string
  sha256?: string
}

export type CollectionManifest = {
  schemaVersion: 1
  id: string
  name: string
  description: string
  createdAt: string
  resources: CollectionResource[]
}

// A collection as the app stores it: a manifest without the format marker.
// The manifest schema is the single source of truth, so stored collections are
// validated by re-attaching `schemaVersion` before checking them.
export type Collection = {
  id: string
  name: string
  description: string
  createdAt: string
  resources: CollectionResource[]
}

export type ManifestValidationResult =
  | { valid: true; manifest: CollectionManifest }
  | { valid: false; errors: string[] }

// The manifest schema requires a non-empty language code. "und" is the ISO
// 639-3 code for an undetermined language.
export const UNDETERMINED_LANGUAGE = 'und'

const ajv = new Ajv({ allErrors: true })

ajv.addFormat('date-time', {
  type: 'string',
  validate: (value: string) => {
    const match =
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(
        value,
      )
    if (!match) return false

    const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offsetHourText, offsetMinuteText] =
      match
    const year = Number(yearText)
    const month = Number(monthText)
    const day = Number(dayText)
    const hour = Number(hourText)
    const minute = Number(minuteText)
    const second = Number(secondText)
    const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
    const daysPerMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    return (
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= (daysPerMonth[month - 1] ?? 0) &&
      hour <= 23 &&
      minute <= 59 &&
      second <= 59 &&
      (!offsetHourText ||
        (Number(offsetHourText) <= 23 && Number(offsetMinuteText) <= 59))
    )
  },
})

const validate = ajv.compile<CollectionManifest>(manifestSchema)

function describeAjvErrors(): string[] {
  return (validate.errors ?? []).map((error) => {
    const location = error.instancePath || 'manifest'
    const detail =
      error.keyword === 'required'
        ? `is missing required field "${String(error.params['missingProperty'])}"`
        : error.message ?? 'is invalid'
    return `${location} ${detail}`
  })
}

export function validateManifestData(data: unknown): ManifestValidationResult {
  if (
    typeof data === 'object' &&
    data !== null &&
    'schemaVersion' in data &&
    data.schemaVersion !== 1
  ) {
    return {
      valid: false,
      errors: [
        `Unsupported manifest schema version "${String(data.schemaVersion)}". This app supports version 1.`,
      ],
    }
  }

  if (!validate(data)) {
    return { valid: false, errors: describeAjvErrors() }
  }

  const resourceIds = new Set<string>()
  for (const resource of data.resources) {
    if (resourceIds.has(resource.id)) {
      return {
        valid: false,
        errors: [`duplicate resource ID "${resource.id}"`],
      }
    }
    resourceIds.add(resource.id)
  }

  return { valid: true, manifest: data }
}

export function serializeManifest(manifest: CollectionManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`
}

export type CollectionListValidationResult =
  | { valid: true; collections: Collection[] }
  | { valid: false; errors: string[] }

export function validateCollectionList(data: unknown): CollectionListValidationResult {
  if (!Array.isArray(data)) {
    return { valid: false, errors: ['collections must be an array'] }
  }

  const collections: Collection[] = []
  const errors: string[] = []
  const seenIds = new Set<string>()

  data.forEach((entry, index) => {
    const result = validateManifestData(
      typeof entry === 'object' && entry !== null
        ? { ...(entry as Record<string, unknown>), schemaVersion: 1 }
        : entry,
    )
    if (!result.valid) {
      errors.push(`collections[${index}]: ${result.errors.join('; ')}`)
      return
    }
    if (seenIds.has(result.manifest.id)) {
      errors.push(`collections[${index}]: duplicate collection ID "${result.manifest.id}"`)
      return
    }
    seenIds.add(result.manifest.id)
    const { schemaVersion: _schemaVersion, ...collection } = result.manifest
    collections.push(collection)
  })

  if (errors.length > 0) {
    return { valid: false, errors }
  }
  return { valid: true, collections }
}
