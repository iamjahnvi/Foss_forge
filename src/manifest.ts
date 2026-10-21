import Ajv from 'ajv'
import manifestSchema from './manifest.schema.json'

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

const validateManifest = ajv.compile<CollectionManifest>(manifestSchema)

function formatValidationErrors(): string {
  return (validateManifest.errors ?? [])
    .map((error) => {
      const location = error.instancePath || 'manifest'
      const detail =
        error.keyword === 'required'
          ? `is missing required field "${String(error.params['missingProperty'])}"`
          : error.message ?? 'is invalid'
      return `${location} ${detail}`
    })
    .join('; ')
}

export function parseManifest(json: string): CollectionManifest {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'schemaVersion' in data &&
    data.schemaVersion !== 1
  ) {
    throw new Error(
      `Unsupported manifest schema version "${String(data.schemaVersion)}". This app supports version 1.`,
    )
  }

  if (!validateManifest(data)) {
    throw new Error(`Invalid Kiwix Collections manifest: ${formatValidationErrors()}.`)
  }

  const resourceIds = new Set<string>()
  for (const resource of data.resources) {
    if (resourceIds.has(resource.id)) {
      throw new Error(`Invalid manifest: duplicate resource ID "${resource.id}".`)
    }
    resourceIds.add(resource.id)
  }

  return data
}

export function serializeManifest(manifest: CollectionManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`
}

export function manifestFilename(collectionName: string): string {
  let safeName = Array.from(collectionName.normalize('NFKD'))
    .filter((character) => !/[\u0300-\u036f]/.test(character))
    .map((character) => {
      const code = character.charCodeAt(0)
      return '<>:"/\\|?*'.includes(character) || code < 32 || code === 127
        ? '-'
        : character
    })
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[. -]+|[. -]+$/g, '')
    .slice(0, 80)

  if (
    !safeName ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safeName)
  ) {
    safeName = `collection-${safeName || 'manifest'}`
  }

  return `${safeName}.json`
}
