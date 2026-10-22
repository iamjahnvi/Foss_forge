import { validateCollectionList, type Collection } from './manifest'

// Every account keeps its own copy, so signing in as somebody else does not
// show their library.
function storageKey(userId: string): string {
  return `kiwix-collections:v1:${userId}`
}

// The browser keeps its own copy of the collection list. It is the fallback
// when the API is unreachable, and it makes a reload keep the user's work even
// if the API process was restarted in between.
export function readStoredCollections(userId: string): Collection[] | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return null

    const result = validateCollectionList(JSON.parse(raw))
    if (!result.valid) {
      window.localStorage.removeItem(storageKey(userId))
      return null
    }
    return result.collections
  } catch {
    return null
  }
}

export function writeStoredCollections(userId: string, collections: Collection[]): void {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(collections))
  } catch {
    // A full or disabled storage must not break the app; the API copy is
    // still the source of truth when it is reachable.
  }
}
