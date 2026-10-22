import type { AccountProfile } from '../shared/account'

export const ACCOUNT_STORAGE_KEY = 'kiwix-collections:account:v1'

export function readAccountProfile(): AccountProfile | null {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' && value !== null &&
      'id' in value && typeof value.id === 'string' &&
      'name' in value && typeof value.name === 'string' &&
      'email' in value && typeof value.email === 'string' &&
      'kiwiId' in value && typeof value.kiwiId === 'string' &&
      'role' in value && (value.role === 'sender' || value.role === 'recipient')
    ) return value as AccountProfile
    window.localStorage.removeItem(ACCOUNT_STORAGE_KEY)
    return null
  } catch {
    return null
  }
}

export function saveAccountProfile(profile: AccountProfile): void {
  try {
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Account creation can still finish when browser storage is unavailable.
  }
}
