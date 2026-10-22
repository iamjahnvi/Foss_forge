// The collections that were sent from one account to another.
//
// A transfer keeps the manifest of the collection, who sent it, who it was
// sent to and when. The archives are not in here: only the description of
// them travels, exactly like a manifest that was handed over as a file or as
// a QR code.

import { randomUUID } from 'node:crypto'
import { CURRENT_SCHEMA_VERSION, type Collection, type CollectionManifest } from '../../shared/manifest.js'
import type { AccountProfile } from './authStore.js'
import type { Database } from './database.js'

export type Transfer = {
  id: string
  sender: AccountProfile
  recipient: AccountProfile
  collectionId: string
  collectionName: string
  manifest: CollectionManifest
  sentAt: string
  readAt: string | null
}

export type TransferStore = {
  send(senderId: string, recipientId: string, collection: Collection): Transfer
  received(accountId: string): Transfer[]
  sent(accountId: string): Transfer[]
  markRead(transferId: string, accountId: string): boolean
}

type TransferRow = {
  id: string
  sender_id: string
  recipient_id: string
  collection_id: string
  collection_name: string
  payload: string
  sent_at: string
  read_at: string | null
  sender_name: string
  sender_kiwi_id: string
  sender_role: string
  recipient_name: string
  recipient_kiwi_id: string
  recipient_role: string
}

// A collection is a manifest without the format marker, so sending one only
// means adding `schemaVersion`.
export function collectionToManifest(collection: Collection): CollectionManifest {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: collection.id,
    name: collection.name,
    description: collection.description,
    createdAt: collection.createdAt,
    resources: collection.resources,
  }
}

export function createTransferStore(database: Database): TransferStore {
  const insert = database.prepare(
    `INSERT INTO transfers
       (id, sender_id, recipient_id, collection_id, collection_name, payload, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  const selectReceived = database.prepare(
    `SELECT t.*,
            s.name AS sender_name, s.kiwi_id AS sender_kiwi_id, s.role AS sender_role,
            r.name AS recipient_name, r.kiwi_id AS recipient_kiwi_id, r.role AS recipient_role
       FROM transfers t
       JOIN accounts s ON s.id = t.sender_id
       JOIN accounts r ON r.id = t.recipient_id
      WHERE t.recipient_id = ?
      ORDER BY t.sent_at DESC`,
  )
  const selectSent = database.prepare(
    `SELECT t.*,
            s.name AS sender_name, s.kiwi_id AS sender_kiwi_id, s.role AS sender_role,
            r.name AS recipient_name, r.kiwi_id AS recipient_kiwi_id, r.role AS recipient_role
       FROM transfers t
       JOIN accounts s ON s.id = t.sender_id
       JOIN accounts r ON r.id = t.recipient_id
      WHERE t.sender_id = ?
      ORDER BY t.sent_at DESC`,
  )
  const markRead = database.prepare(
    `UPDATE transfers SET read_at = ?
      WHERE id = ? AND recipient_id = ? AND read_at IS NULL`,
  )

  function toTransfer(row: TransferRow): Transfer {
    return {
      id: row.id,
      sender: {
        id: row.sender_id,
        name: row.sender_name,
        kiwiId: row.sender_kiwi_id,
        role: row.sender_role as AccountProfile['role'],
      },
      recipient: {
        id: row.recipient_id,
        name: row.recipient_name,
        kiwiId: row.recipient_kiwi_id,
        role: row.recipient_role as AccountProfile['role'],
      },
      collectionId: row.collection_id,
      collectionName: row.collection_name,
      manifest: JSON.parse(row.payload) as CollectionManifest,
      sentAt: row.sent_at,
      readAt: row.read_at,
    }
  }

  function send(senderId: string, recipientId: string, collection: Collection): Transfer {
    const id = randomUUID()
    const sentAt = new Date().toISOString()
    const manifest = collectionToManifest(collection)

    insert.run(
      id,
      senderId,
      recipientId,
      collection.id,
      collection.name,
      JSON.stringify(manifest),
      sentAt,
    )

    return {
      id,
      sender: { id: senderId, name: '', kiwiId: '', role: 'sender' },
      recipient: { id: recipientId, name: '', kiwiId: '', role: 'receiver' },
      collectionId: collection.id,
      collectionName: collection.name,
      manifest,
      sentAt,
      readAt: null,
    }
  }

  function received(accountId: string): Transfer[] {
    return (selectReceived.all(accountId) as TransferRow[]).map(toTransfer)
  }

  function sent(accountId: string): Transfer[] {
    return (selectSent.all(accountId) as TransferRow[]).map(toTransfer)
  }

  function markReadOne(transferId: string, accountId: string): boolean {
    const result = markRead.run(new Date().toISOString(), transferId, accountId)
    return result.changes > 0
  }

  return { send, received, sent, markRead: markReadOne }
}
