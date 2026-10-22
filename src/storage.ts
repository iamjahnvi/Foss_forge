import { validateCollectionList, type Collection } from './manifest'

const STORAGE_KEY = 'kiwix-collections:v1:local'

export function readStoredCollections(): Collection[] | null {
  try {
    window.localStorage.removeItem('kiwix-collections:session:v1')
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const result = validateCollectionList(JSON.parse(raw))
      if (result.valid) return result.collections
      window.localStorage.removeItem(STORAGE_KEY)
    }

    // Migrate libraries saved by the former account-based version into the
    // single local library, keeping the collections users already created.
    const migrated = new Map<string, Collection>()
    const legacyKeys: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key?.startsWith('kiwix-collections:v1:') || key === STORAGE_KEY) continue
      const legacyRaw = window.localStorage.getItem(key)
      if (!legacyRaw) continue
      const result = validateCollectionList(JSON.parse(legacyRaw))
      if (!result.valid) continue
      result.collections.forEach((collection) => migrated.set(collection.id, collection))
      legacyKeys.push(key)
    }
    const collections = [...migrated.values()]
    if (collections.length) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collections))
      legacyKeys.forEach((key) => window.localStorage.removeItem(key))
      return collections
    }
    return null
  } catch {
    return null
  }
}

export function writeStoredCollections(collections: Collection[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collections))
  } catch {
    // Disabled or full browser storage should not prevent use for this visit.
  }
}
