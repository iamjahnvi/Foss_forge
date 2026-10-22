import type { AuthUser, SignUpInput } from '../shared/auth'
import type { Collection } from './manifest'

const API_BASE = '/api'

// The session token lives here so every request can carry it, and so the
// browser can forget it the moment somebody signs out.
let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

export class ApiError extends Error {
  status: number
  field: string | null

  constructor(message: string, status: number, field: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.field = field
  }
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return authToken ? { ...extra, authorization: `Bearer ${authToken}` } : extra
}

async function readError(response: Response, fallback: string): Promise<ApiError> {
  try {
    const body = (await response.json()) as { error?: string; field?: string }
    return new ApiError(body.error ?? fallback, response.status, body.field ?? null)
  } catch {
    return new ApiError(fallback, response.status)
  }
}

export async function fetchCollections(signal?: AbortSignal): Promise<Collection[]> {
  const response = await fetch(`${API_BASE}/collections`, {
    headers: authHeaders({ accept: 'application/json' }),
    signal,
  })

  if (!response.ok) {
    throw await readError(response, `The API responded with ${response.status}.`)
  }

  const data = (await response.json()) as { collections?: unknown }
  if (!Array.isArray(data.collections)) {
    throw new ApiError('The API returned an unexpected response.', response.status)
  }
  return data.collections as Collection[]
}

export async function saveCollections(collections: Collection[]): Promise<void> {
  const response = await fetch(`${API_BASE}/collections`, {
    method: 'PUT',
    headers: authHeaders({ 'content-type': 'application/json' }),
    body: JSON.stringify({ collections }),
  })

  if (!response.ok) {
    throw await readError(response, `The API rejected the collection list (${response.status}).`)
  }
}

export async function createAccount(input: SignUpInput): Promise<{ user: AuthUser; token: string }> {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await readError(response, 'The account could not be created.')
  }

  return (await response.json()) as { user: AuthUser; token: string }
}

export async function signIn(
  identifier: string,
  password: string,
): Promise<{ user: AuthUser; token: string }> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })

  if (!response.ok) {
    throw await readError(response, 'The sign in did not work.')
  }

  return (await response.json()) as { user: AuthUser; token: string }
}

export async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders({ accept: 'application/json' }),
    signal,
  })

  if (response.status === 401) return null
  if (!response.ok) {
    throw await readError(response, `The API responded with ${response.status}.`)
  }

  const data = (await response.json()) as { user?: AuthUser }
  return data.user ?? null
}

export async function endSession(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/signout`, {
    method: 'POST',
    headers: authHeaders(),
  })

  if (!response.ok && response.status !== 401) {
    throw await readError(response, 'The session could not be closed.')
  }
}
