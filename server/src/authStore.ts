// Accounts and sessions.
//
// The accounts live in the database, so they are still there after the API is
// restarted. Passwords are never stored in the clear: they are hashed with
// scrypt and a per-account salt. A session is an opaque random token that the
// browser keeps and sends with every request.
//
// The kiwi id is generated at random when the account is created. The person
// does not choose it, so nobody can take a handle that is already in use, and
// the database keeps it unique.

import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import {
  generateKiwiId,
  normalizeEmail,
  normalizeKiwiId,
  type AuthUser,
  type SignUpInput,
  type UserRole,
} from '../../shared/auth.js'
import type { Database } from './database.js'

const scrypt = promisify(scryptCallback)

const KEY_LENGTH = 64

// How many times a new kiwi id is tried before the account is given up on.
const KIWI_ID_ATTEMPTS = 5

export class DuplicateAccountError extends Error {
  field: 'email' | 'kiwiId'

  constructor(field: 'email' | 'kiwiId', message: string) {
    super(message)
    this.name = 'DuplicateAccountError'
    this.field = field
  }
}

export type AccountProfile = {
  id: string
  name: string
  kiwiId: string
  role: UserRole
}

export type AuthStore = {
  createUser(input: SignUpInput): Promise<AuthUser>
  findByIdentifier(identifier: string): AuthUser | undefined
  findByKiwiId(kiwiId: string): AuthUser | undefined
  listAccounts(): AuthUser[]
  authenticate(identifier: string, password: string): Promise<AuthUser | null>
  startSession(userId: string): string
  userForToken(token: string): AuthUser | undefined
  endSession(token: string): void
}

type AccountRow = {
  id: string
  name: string
  email: string
  kiwi_id: string
  role: string
  password_hash: string
  created_at: string
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false

  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  if (expected.length === 0) return false

  const derived = (await scrypt(password, salt, expected.length)) as Buffer
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

function rowToUser(row: AccountRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    kiwiId: row.kiwi_id,
    role: row.role as UserRole,
    createdAt: row.created_at,
  }
}

export function createAuthStore(database: Database): AuthStore {
  const insertAccount = database.prepare(
    `INSERT INTO accounts (id, name, email, kiwi_id, role, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  const selectByEmail = database.prepare('SELECT * FROM accounts WHERE email = ?')
  const selectByKiwiId = database.prepare('SELECT * FROM accounts WHERE kiwi_id = ?')
  const selectById = database.prepare('SELECT * FROM accounts WHERE id = ?')
  const selectAll = database.prepare('SELECT * FROM accounts ORDER BY name')
  const insertSession = database.prepare(
    'INSERT INTO sessions (token, account_id, created_at) VALUES (?, ?, ?)',
  )
  const selectSession = database.prepare('SELECT account_id FROM sessions WHERE token = ?')
  const deleteSession = database.prepare('DELETE FROM sessions WHERE token = ?')

  function findByEmail(email: string): AuthUser | undefined {
    const row = selectByEmail.get(normalizeEmail(email)) as AccountRow | undefined
    return row ? rowToUser(row) : undefined
  }

  function findByKiwiId(kiwiId: string): AuthUser | undefined {
    const row = selectByKiwiId.get(normalizeKiwiId(kiwiId)) as AccountRow | undefined
    return row ? rowToUser(row) : undefined
  }

  async function createUser(input: SignUpInput): Promise<AuthUser> {
    const email = normalizeEmail(input.email)
    const name = input.name.trim()

    if (findByEmail(email)) {
      throw new DuplicateAccountError('email', 'An account with this email address already exists.')
    }

    const passwordHash = await hashPassword(input.password)

    // The kiwi id is drawn at random. If it is already taken another one is
    // drawn, so the id stays unique without the person choosing it.
    for (let attempt = 0; attempt < KIWI_ID_ATTEMPTS; attempt += 1) {
      const kiwiId = generateKiwiId()
      if (findByKiwiId(kiwiId)) continue

      const user: AuthUser = {
        id: randomUUID(),
        name,
        email,
        kiwiId,
        role: input.role,
        createdAt: new Date().toISOString(),
      }

      try {
        insertAccount.run(
          user.id,
          user.name,
          user.email,
          user.kiwiId,
          user.role,
          passwordHash,
          user.createdAt,
        )
        return user
      } catch (error) {
        if (isUniqueViolation(error)) continue
        throw error
      }
    }

    throw new Error('A free kiwi id could not be found. Please try again.')
  }

  function findByIdentifier(identifier: string): AuthUser | undefined {
    const value = identifier.trim().toLowerCase()
    return findByKiwiId(value) ?? findByEmail(value)
  }

  async function authenticate(identifier: string, password: string): Promise<AuthUser | null> {
    const user = findByIdentifier(identifier)
    if (!user) return null

    const row = selectById.get(user.id) as AccountRow | undefined
    if (!row) return null

    const matches = await verifyPassword(password, row.password_hash)
    return matches ? rowToUser(row) : null
  }

  function listAccounts(): AuthUser[] {
    return (selectAll.all() as AccountRow[]).map(rowToUser)
  }

  function startSession(userId: string): string {
    const token = randomBytes(32).toString('hex')
    insertSession.run(token, userId, new Date().toISOString())
    return token
  }

  function userForToken(token: string): AuthUser | undefined {
    const row = selectSession.get(token) as { account_id: string } | undefined
    if (!row) return undefined

    const account = selectById.get(row.account_id) as AccountRow | undefined
    return account ? rowToUser(account) : undefined
  }

  function endSession(token: string): void {
    deleteSession.run(token)
  }

  return {
    createUser,
    findByIdentifier,
    findByKiwiId,
    listAccounts,
    authenticate,
    startSession,
    userForToken,
    endSession,
  }
}

// SQLite says a unique column is taken with this message.
function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && error.message.includes('UNIQUE constraint failed')
}
