import { useCallback, useEffect, useRef, useState } from 'react'
import { readStoredCollections, writeStoredCollections } from './storage'
import type { Collection } from './manifest'

export type CollectionsSyncStatus = 'loading' | 'local'

export function useCollections() {
  // Collections live in browser storage, so they can be read synchronously
  // when the hook first renders.
  const [collections, setCollections] = useState<Collection[]>(() => readStoredCollections() ?? [])
  const [syncStatus] = useState<CollectionsSyncStatus>('local')
  const savedSnapshotRef = useRef<string | null>(JSON.stringify(collections))

  useEffect(() => {
    if (syncStatus === 'loading') return
    const snapshot = JSON.stringify(collections)
    if (snapshot === savedSnapshotRef.current) return
    savedSnapshotRef.current = snapshot
    writeStoredCollections(collections)
  }, [collections, syncStatus])

  const addCollection = useCallback((collection: Collection) => {
    setCollections((current) => [...current, collection])
  }, [])

  const updateCollection = useCallback(
    (id: string, updater: (collection: Collection) => Collection) => {
      setCollections((current) =>
        current.map((collection) => (collection.id === id ? updater(collection) : collection)),
      )
    },
    [],
  )

  const removeCollection = useCallback((id: string) => {
    setCollections((current) => current.filter((collection) => collection.id !== id))
  }, [])

  const replaceCollections = useCallback((next: Collection[]) => {
    setCollections(next)
  }, [])

  return {
    collections,
    syncStatus,
    syncError: '',
    addCollection,
    updateCollection,
    removeCollection,
    replaceCollections,
  }
}
