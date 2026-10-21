import { validateCollectionList, type Collection } from './manifest'

const STORAGE_KEY = 'kiwix-collections:v1'

// The browser keeps its own copy of the collection list. It is the fallback
// when the API is unreachable, and it makes a reload keep the user's work even
// if the API process was restarted in between.
export function readStoredCollections(): Collection[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const result = validateCollectionList(JSON.parse(raw))
    if (!result.valid) {
      window.localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return result.collections
  } catch {
    return null
  }
}

export function writeStoredCollections(collections: Collection[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collections))
  } catch {
    // A full or disabled storage must not break the app; the API copy is
    // still the source of truth when it is reachable.
  }
}
