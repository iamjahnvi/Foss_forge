import {
  validateManifestData,
  type Collection,
  type CollectionManifest,
  type CollectionResource,
} from '../shared/manifest'

export type { Collection, CollectionManifest, CollectionResource }
export {
  serializeManifest,
  validateCollectionList,
  validateManifestData,
  UNDETERMINED_LANGUAGE,
} from '../shared/manifest'

export function parseManifest(json: string): CollectionManifest {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }

  const result = validateManifestData(data)
  if (!result.valid) {
    const errors = result.errors.map((error) =>
      error.startsWith('Unsupported manifest schema version')
        ? error
        : error.startsWith('duplicate resource ID')
          ? `Invalid manifest: ${error}.`
          : error,
    )
    throw new Error(`Invalid Kiwix Collections manifest: ${errors.join('; ')}.`)
  }

  return result.manifest
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
