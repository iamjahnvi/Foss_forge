import type { Collection } from './manifest'

const API_BASE = '/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function fetchCollections(signal?: AbortSignal): Promise<Collection[]> {
  const response = await fetch(`${API_BASE}/collections`, {
    headers: { accept: 'application/json' },
    signal,
  })

  if (!response.ok) {
    throw new ApiError(`The API responded with ${response.status}.`, response.status)
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
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ collections }),
  })

  if (!response.ok) {
    throw new ApiError(`The API rejected the collection list (${response.status}).`, response.status)
  }
}
