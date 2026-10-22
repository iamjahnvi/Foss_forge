// The collections of every account.
//
// Each collection is a row that belongs to one account, so one person's
// library never shows up in another's. The browser keeps its own copy and
// re-sends the full list on every change, so the API does not have to know
// about every small edit.

import type { Collection } from '../../shared/manifest.js'
import type { Database } from './database.js'

export type CollectionStore = {
  list(userId: string): Collection[]
  replaceAll(userId: string, collections: Collection[]): Collection[]
  remove(userId: string, id: string): boolean
  find(userId: string, id: string): Collection | undefined
}

type CollectionRow = {
  id: string
  payload: string
}

export function createCollectionStore(database: Database): CollectionStore {
  const selectAll = database.prepare(
    'SELECT id, payload FROM collections WHERE account_id = ? ORDER BY name',
  )
  const selectOne = database.prepare(
    'SELECT id, payload FROM collections WHERE account_id = ? AND id = ?',
  )
  const insert = database.prepare(
    `INSERT INTO collections (id, account_id, name, payload, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
  const removeOne = database.prepare(
    'DELETE FROM collections WHERE account_id = ? AND id = ?',
  )
  const removeAll = database.prepare('DELETE FROM collections WHERE account_id = ?')

  function list(userId: string): Collection[] {
    const rows = selectAll.all(userId) as CollectionRow[]
    return rows.map((row) => JSON.parse(row.payload) as Collection)
  }

  function find(userId: string, id: string): Collection | undefined {
    const row = selectOne.get(userId, id) as CollectionRow | undefined
    return row ? (JSON.parse(row.payload) as Collection) : undefined
  }

  function replaceAll(userId: string, collections: Collection[]): Collection[] {
    const now = new Date().toISOString()
    database.exec('BEGIN')
    try {
      removeAll.run(userId)
      for (const collection of collections) {
        insert.run(
          collection.id,
          userId,
          collection.name,
          JSON.stringify(collection),
          now,
        )
      }
      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
    return list(userId)
  }

  function remove(userId: string, id: string): boolean {
    const result = removeOne.run(userId, id)
    return result.changes > 0
  }

  return { list, replaceAll, remove, find }
}
