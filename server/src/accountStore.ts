import { mkdirSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import bcrypt from 'bcrypt'
import type { AccountProfile, AccountRole } from '../../shared/account.js'
import type { CollectionManifest } from '../../shared/manifest.js'
import { demoRecipients } from './demoRecipients.js'

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

export type RecipientProfile = Pick<AccountProfile, 'id' | 'name' | 'email' | 'kiwiId' | 'role'>

export type ReceivedTransfer = {
  id: string
  collection: CollectionManifest
  sentAt: string
  sender: RecipientProfile
}

type AccountRow = {
  id: string
  name: string
  email: string
  kiwi_id: string
  role: AccountRole
  password_hash: string
  created_at: string
}

function toProfile(row: AccountRow): AccountProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    kiwiId: row.kiwi_id,
    role: row.role,
    createdAt: row.created_at,
  }
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
    ;
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      payload TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      read_at TEXT
    );
    CREATE INDEX IF NOT EXISTS transfers_recipient ON transfers(recipient_id, sent_at DESC);
  `)
  if (process.env['NODE_ENV'] !== 'production') {
    const insertDemoRecipient = database.prepare(
      `INSERT OR IGNORE INTO accounts (id, name, email, kiwi_id, role, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const recipient of demoRecipients) {
      insertDemoRecipient.run(
        recipient.id,
        recipient.name,
        recipient.email,
        recipient.kiwiId,
        recipient.role,
        recipient.passwordHash,
        recipient.createdAt,
      )
    }
  }
  const findEmail = database.prepare('SELECT 1 FROM accounts WHERE email = ? COLLATE NOCASE')
  const insert = database.prepare(
    'INSERT INTO accounts (id, name, email, kiwi_id, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  )
  const findCredentials = database.prepare('SELECT * FROM accounts WHERE email = ? COLLATE NOCASE')
  const insertSession = database.prepare('INSERT INTO sessions (token, account_id, created_at) VALUES (?, ?, ?)')
  const findSession = database.prepare('SELECT account_id FROM sessions WHERE token = ?')
  const findAccount = database.prepare('SELECT * FROM accounts WHERE id = ?')
  const listRecipientRows = database.prepare("SELECT * FROM accounts WHERE role = 'recipient' ORDER BY name COLLATE NOCASE")
  const findAccountByKiwiId = database.prepare('SELECT * FROM accounts WHERE kiwi_id = ? COLLATE NOCASE')
  const insertTransfer = database.prepare(
    'INSERT INTO transfers (id, sender_id, recipient_id, payload, sent_at) VALUES (?, ?, ?, ?, ?)',
  )
  const listReceivedRows = database.prepare(
    `SELECT t.id, t.payload, t.sent_at, a.id AS sender_id, a.name AS sender_name,
      a.email AS sender_email, a.kiwi_id AS sender_kiwi_id, a.role AS sender_role,
      a.created_at AS sender_created_at
     FROM transfers t JOIN accounts a ON a.id = t.sender_id
     WHERE t.recipient_id = ? ORDER BY t.sent_at DESC`,
  )
  const listUnreadRows = database.prepare(
    `SELECT t.id, t.payload, t.sent_at, a.id AS sender_id, a.name AS sender_name,
      a.email AS sender_email, a.kiwi_id AS sender_kiwi_id, a.role AS sender_role,
      a.created_at AS sender_created_at
     FROM transfers t JOIN accounts a ON a.id = t.sender_id
     WHERE t.recipient_id = ? AND t.read_at IS NULL ORDER BY t.sent_at DESC`,
  )
  const markTransferReadStatement = database.prepare(
    'UPDATE transfers SET read_at = ? WHERE id = ? AND recipient_id = ?',
  )
  const getReceivedRow = database.prepare(
    `SELECT t.id, t.payload, t.sent_at, a.id AS sender_id, a.name AS sender_name,
      a.email AS sender_email, a.kiwi_id AS sender_kiwi_id, a.role AS sender_role,
      a.created_at AS sender_created_at
     FROM transfers t JOIN accounts a ON a.id = t.sender_id
     WHERE t.id = ? AND t.recipient_id = ?`,
  )

  function startSession(userId: string): string {
    const token = randomBytes(32).toString('base64url')
    insertSession.run(token, userId, new Date().toISOString())
    return token
  }

  function toReceivedTransfer(row: Record<string, unknown>): ReceivedTransfer {
    return {
      id: row['id'] as string,
      collection: JSON.parse(row['payload'] as string) as CollectionManifest,
      sentAt: row['sent_at'] as string,
      sender: {
        id: row['sender_id'] as string,
        name: row['sender_name'] as string,
        email: row['sender_email'] as string,
        kiwiId: row['sender_kiwi_id'] as string,
        role: row['sender_role'] as AccountRole,
      },
    }
  }

  return {
    async create(input: NewAccount): Promise<{ user: AccountProfile; token: string }> {
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

      const user = { id, name, email, kiwiId, role: input.role, createdAt }
      return { user, token: startSession(id) }
    },
    async authenticate(nameInput: string, emailInput: string, password: string): Promise<{ user: AccountProfile; token: string } | null> {
      const email = emailInput.trim().toLowerCase()
      const name = nameInput.trim().toLocaleLowerCase()
      const row = findCredentials.get(email) as AccountRow | undefined
      if (!row || row.name.toLocaleLowerCase() !== name) return null
      if (!(await bcrypt.compare(password, row.password_hash))) return null
      return { user: toProfile(row), token: startSession(row.id) }
    },
    userForToken(token: string): AccountProfile | null {
      const session = findSession.get(token) as { account_id: string } | undefined
      if (!session) return null
      const row = findAccount.get(session.account_id) as AccountRow | undefined
      return row ? toProfile(row) : null
    },
    listRecipients(): RecipientProfile[] {
      return (listRecipientRows.all() as AccountRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        kiwiId: row.kiwi_id,
        role: row.role,
      }))
    },
    sendCollection(sender: AccountProfile, recipientKiwiId: string, collection: CollectionManifest): ReceivedTransfer {
      if (sender.role !== 'sender') throw new Error('Only sender accounts can send collections.')
      const recipient = findAccountByKiwiId.get(recipientKiwiId.trim()) as AccountRow | undefined
      if (!recipient || recipient.role !== 'recipient') throw new Error('Choose a valid recipient from the recipient pool.')
      const id = randomUUID()
      const sentAt = new Date().toISOString()
      insertTransfer.run(id, sender.id, recipient.id, JSON.stringify(collection), sentAt)
      return {
        id,
        collection,
        sentAt,
        sender: { id: sender.id, name: sender.name, email: sender.email, kiwiId: sender.kiwiId, role: sender.role },
      }
    },
    listReceived(account: AccountProfile): ReceivedTransfer[] {
      if (account.role !== 'recipient') return []
      return (listReceivedRows.all(account.id) as Record<string, unknown>[]).map(toReceivedTransfer)
    },
    listUnread(account: AccountProfile): ReceivedTransfer[] {
      if (account.role !== 'recipient') return []
      return (listUnreadRows.all(account.id) as Record<string, unknown>[]).map(toReceivedTransfer)
    },
    markReceivedRead(account: AccountProfile, transferId: string): boolean {
      if (account.role !== 'recipient') return false
      const result = markTransferReadStatement.run(new Date().toISOString(), transferId, account.id)
      return Number(result.changes) > 0
    },
    getReceived(account: AccountProfile, transferId: string): ReceivedTransfer | null {
      if (account.role !== 'recipient') return null
      const row = getReceivedRow.get(transferId, account.id) as Record<string, unknown> | undefined
      return row ? toReceivedTransfer(row) : null
    },
  }
}
