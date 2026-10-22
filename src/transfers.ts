import type { AccountProfile } from '../shared/account'
import type { CollectionManifest } from './manifest'

export type RecipientProfile = Pick<AccountProfile, 'id' | 'name' | 'email' | 'kiwiId' | 'role'>
export type ReceivedTransfer = {
  id: string
  collection: CollectionManifest
  sentAt: string
  sender: RecipientProfile
}

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  })
  const data = await response.json() as T | { error?: string }
  if (!response.ok) {
    const details = data as { error?: string }
    throw new Error(details.error || 'The transfer service could not complete the request.')
  }
  return data as T
}

export async function fetchRecipients(token: string): Promise<RecipientProfile[]> {
  const result = await api<{ recipients: RecipientProfile[] }>('/api/recipients', token)
  return result.recipients
}

export async function sendCollection(token: string, recipientKiwiId: string, collection: CollectionManifest): Promise<ReceivedTransfer> {
  const result = await api<{ transfer: ReceivedTransfer }>('/api/transfers', token, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recipientKiwiId, collection }),
  })
  return result.transfer
}

export async function fetchReceived(token: string): Promise<ReceivedTransfer[]> {
  const result = await api<{ transfers: ReceivedTransfer[] }>('/api/transfers/received', token)
  return result.transfers
}

export async function fetchTransfer(token: string, id: string): Promise<ReceivedTransfer> {
  const result = await api<{ transfer: ReceivedTransfer }>(`/api/transfers/${encodeURIComponent(id)}`, token)
  return result.transfer
}
