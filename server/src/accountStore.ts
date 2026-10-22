import { mkdirSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcrypt'
import type { AccountProfile, AccountRole } from '../../shared/account.js'

export class DuplicateEmailError extends Error {
  constructor() {
    super('An account with this email address already exists.')
    this.name = 'DuplicateEmailError'
  }
}

export type NewAccount = {
  name: string
  email: string
  password: string
  role: AccountRole
}

export function createAccountStore() {
  const configuredPath = process.env['KIWIX_ACCOUNTS_DB'] ?? 'server-data/accounts.db'
  const path = resolve(process.cwd(), configuredPath)
  mkdirSync(dirname(path), { recursive: true })
  const database = new DatabaseSync(path)
  database.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      kiwi_id TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('sender', 'recipient')),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
  const findEmail = database.prepare('SELECT 1 FROM accounts WHERE email = ? COLLATE NOCASE')
  const insert = database.prepare(
    'INSERT INTO accounts (id, name, email, kiwi_id, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )

  return {
    async create(input: NewAccount): Promise<AccountProfile> {
      const name = input.name.trim()
      const email = input.email.trim().toLowerCase()
      if (findEmail.get(email)) throw new DuplicateEmailError()

      const passwordHash = await bcrypt.hash(input.password, 12)
      const id = randomUUID()
      const createdAt = new Date().toISOString()
      let kiwiId = ''
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = `kiwi-${randomBytes(5).toString('hex')}`
        try {
          insert.run(id, name, email, candidate, input.role, passwordHash, createdAt)
          kiwiId = candidate
          break
        } catch (error) {
          if (error instanceof Error && error.message.includes('email')) throw new DuplicateEmailError()
          if (attempt === 4) throw error
        }
      }

      return { id, name, email, kiwiId, role: input.role, createdAt }
    },
  }
}
