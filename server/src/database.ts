// The database.
//
// Accounts, sessions, collections and the collections that were sent from one
// account to another are kept in a SQLite file, so everything survives a
// restart of the API. The file lives in `server-data/` and is ignored by git.
// The tests use a database in memory instead.

import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type Database = DatabaseSync

export type DatabaseOptions = {
  // The path of the database file. ':memory:' keeps everything in memory.
  path?: string
}

export const DEFAULT_DATABASE_PATH = 'server-data/kiwix-collections.db'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  kiwi_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_id, id)
);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  payload TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS transfers_recipient ON transfers(recipient_id);
CREATE INDEX IF NOT EXISTS transfers_sender ON transfers(sender_id);
`

export function databasePath(options: DatabaseOptions = {}): string {
  const configured = options.path ?? process.env.KIWIX_COLLECTIONS_DB ?? DEFAULT_DATABASE_PATH
  if (configured === ':memory:') return configured
  return resolve(process.cwd(), configured)
}

export function createDatabase(options: DatabaseOptions = {}): Database {
  const path = databasePath(options)

  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }

  const database = new DatabaseSync(path)
  database.exec('PRAGMA foreign_keys = ON')
  database.exec('PRAGMA journal_mode = WAL')
  database.exec(SCHEMA)
  return database
}
