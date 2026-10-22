// Local inventory: the catalogue of ZIM archives the user has on their own
// machine. Files are read in the browser and never uploaded; only the
// extracted metadata is kept.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  mergeInventoryEntries,
  scanZimFile,
  type InventoryEntry,
} from './inventory'
import { isZimFileName } from './zim'

const STORAGE_KEY = 'kiwix-collections:inventory:v1'

function readStoredInventory(): InventoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as InventoryEntry[]) : []
  } catch {
    return []
  }
}

export function useInventory() {
  const [entries, setEntries] = useState<InventoryEntry[]>(readStoredInventory)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const savedSnapshotRef = useRef<string | null>(null)

  useEffect(() => {
    const snapshot = JSON.stringify(entries)
    if (snapshot === savedSnapshotRef.current) return
    savedSnapshotRef.current = snapshot
    try {
      window.localStorage.setItem(STORAGE_KEY, snapshot)
    } catch {
      // Storage is optional; the inventory still works for the session.
    }
  }, [entries])

  const scan = useCallback(async (files: File[]): Promise<InventoryEntry[]> => {
    setError('')
    setMessage('')

    const zimFiles = files.filter((file) => isZimFileName(file.name))
    const skipped = files.length - zimFiles.length
    if (zimFiles.length === 0) {
      setError('Choose at least one .zim archive to scan.')
      return []
    }

    setIsScanning(true)
    const scanned: InventoryEntry[] = []
    const failures: string[] = []

    for (const file of zimFiles) {
      try {
        scanned.push(await scanZimFile(file))
      } catch (cause) {
        failures.push(
          `${file.name}: ${cause instanceof Error ? cause.message : 'the file could not be read.'}`,
        )
      }
    }
    setIsScanning(false)

    if (scanned.length > 0) {
      setEntries((current) => mergeInventoryEntries(current, scanned))
    }

    if (failures.length > 0) {
      setError(failures.join(' '))
    }
    if (skipped > 0) {
      setMessage(
        `${skipped} file${skipped === 1 ? '' : 's'} skipped: only .zim archives are part of the inventory.`,
      )
    } else if (scanned.length > 0 && failures.length === 0) {
      setMessage(
        `${scanned.length} archive${scanned.length === 1 ? '' : 's'} added to the local inventory.`,
      )
    }
    return scanned
  }, [])

  const removeEntry = useCallback((entryId: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== entryId))
  }, [])

  const updateEntry = useCallback((entryId: string, patch: Partial<InventoryEntry>) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
    )
  }, [])

  return { entries, isScanning, error, message, scan, removeEntry, updateEntry }
}
