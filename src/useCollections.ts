import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCollections, saveCollections } from './api'
import { readStoredCollections, writeStoredCollections } from './storage'
import type { Collection } from './manifest'

// Where the collection list currently lives.
//   'api'   - the API holds the list and every change is sent to it.
//   'local' - the API is unreachable, so the list only lives in this browser.
//   'loading' - the first load has not finished yet.
export type CollectionsSyncStatus = 'loading' | 'api' | 'local'

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [syncStatus, setSyncStatus] = useState<CollectionsSyncStatus>('loading')
  const [syncError, setSyncError] = useState('')
  const savedSnapshotRef = useRef<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchCollections(controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return
        savedSnapshotRef.current = JSON.stringify(loaded)
        setCollections(loaded)
        setSyncStatus('api')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        const stored = readStoredCollections()
        savedSnapshotRef.current = stored ? JSON.stringify(stored) : null
        setCollections(stored ?? [])
        setSyncStatus('local')
        setSyncError(
          stored
            ? 'The API is unreachable, so changes are kept in this browser only.'
            : 'The API is unreachable, so this session starts empty and changes are kept in this browser only.',
        )
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (syncStatus === 'loading') return

    const snapshot = JSON.stringify(collections)
    if (snapshot === savedSnapshotRef.current) return
    savedSnapshotRef.current = snapshot

    // The local copy is written first so a failing API never loses work.
    writeStoredCollections(collections)
    if (syncStatus !== 'api') return

    const timer = window.setTimeout(() => {
      saveCollections(collections).catch((error: unknown) => {
        setSyncStatus('local')
        setSyncError(
          error instanceof Error
            ? `The API could not store the changes: ${error.message}`
            : 'The API could not store the changes.',
        )
      })
    }, 300)

    return () => window.clearTimeout(timer)
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
    syncError,
    addCollection,
    updateCollection,
    removeCollection,
    replaceCollections,
  }
}
