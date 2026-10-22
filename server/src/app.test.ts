import { createServer, type Server } from 'node:http'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app'
import { createCollectionStore } from './collectionStore'
import type { Collection } from '../../shared/manifest'

const collection: Collection = {
  id: 'collection-1',
  name: 'World history',
  description: 'A reading list',
  createdAt: '2026-10-21T10:00:00.000Z',
  resources: [
    {
      id: 'zim-aaaa1111',
      title: 'History encyclopedia',
      language: 'en',
      sizeBytes: 4096,
      filename: 'history_en.zim',
      zimUuid: 'aaaa1111-2222-3333-4444-555566667777',
    },
  ],
}

describe('API', () => {
  let server: Server
  let baseUrl: string
  let token: string

  // The collections belong to an account, so every test signs one up first.
  async function signUp(kiwiId: string): Promise<string> {
    const response = await fetch(`${baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Person',
        email: `${kiwiId}@example.org`,
        kiwiId,
        role: 'sender',
        password: 'correct horse battery',
      }),
    })
    const body = (await response.json()) as { token: string }
    return body.token
  }

  function authHeaders(): Record<string, string> {
    return { authorization: `Bearer ${token}` }
  }

  beforeAll(async () => {
    server = createServer(createApp({ store: createCollectionStore() }))
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (!address || typeof address === 'string') {
          reject(new Error('Could not determine the health test server address.'))
          return
        }
        baseUrl = `http://127.0.0.1:${address.port}`
        resolve()
      })
    })
  })

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })

  beforeEach(async () => {
    token = await signUp(`kiwi-${Math.random().toString(36).slice(2, 8)}`)
  })

  describe('GET /api/health', () => {
    it('returns a successful JSON health response', async () => {
      const response = await fetch(`${baseUrl}/api/health`)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('application/json')
      await expect(response.json()).resolves.toEqual({ status: 'ok' })
    })
  })

  describe('GET /api/collections', () => {
    it('returns an empty list when nothing is stored', async () => {
      const response = await fetch(`${baseUrl}/api/collections`, {
        headers: authHeaders(),
      })

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ collections: [] })
    })

    it('refuses to list collections without a session', async () => {
      const response = await fetch(`${baseUrl}/api/collections`)

      expect(response.status).toBe(401)
      const body = (await response.json()) as { error: string }
      expect(body.error).toContain('Sign in')
    })
  })

  describe('PUT /api/collections', () => {
    it('stores a valid collection list', async () => {
      const response = await fetch(`${baseUrl}/api/collections`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ collections: [collection] }),
      })

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ collections: [collection] })

      const stored = await fetch(`${baseUrl}/api/collections`, { headers: authHeaders() })
      await expect(stored.json()).resolves.toEqual({ collections: [collection] })
    })

    it('replaces the stored list on a second request', async () => {
      const response = await fetch(`${baseUrl}/api/collections`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ collections: [] }),
      })

      expect(response.status).toBe(200)
      const stored = await fetch(`${baseUrl}/api/collections`, { headers: authHeaders() })
      await expect(stored.json()).resolves.toEqual({ collections: [] })
    })

    it('rejects a collection without a name', async () => {
      const response = await fetch(`${baseUrl}/api/collections`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ collections: [{ ...collection, name: '' }] }),
      })

      expect(response.status).toBe(400)
      const body = (await response.json()) as { error: string }
      expect(body.error).toContain('Invalid collections')
    })

    it('rejects duplicate collection ids', async () => {
      const response = await fetch(`${baseUrl}/api/collections`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ collections: [collection, collection] }),
      })

      expect(response.status).toBe(400)
      const body = (await response.json()) as { error: string }
      expect(body.error).toContain('duplicate collection ID')
    })

    it('rejects a body that is not valid JSON', async () => {
      const response = await fetch(`${baseUrl}/api/collections`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: '{not json',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /api/collections/:id', () => {
    it('removes a stored collection', async () => {
      await fetch(`${baseUrl}/api/collections`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ collections: [collection] }),
      })

      const response = await fetch(`${baseUrl}/api/collections/${collection.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })

      expect(response.status).toBe(200)
      await expect(response.json()).resolves.toEqual({ removed: true })

      const stored = await fetch(`${baseUrl}/api/collections`, { headers: authHeaders() })
      await expect(stored.json()).resolves.toEqual({ collections: [] })
    })

    it('reports when the collection was not stored', async () => {
      const response = await fetch(`${baseUrl}/api/collections/missing`, {
        method: 'DELETE',
        headers: authHeaders(),
      })

      await expect(response.json()).resolves.toEqual({ removed: false })
    })
  })

  describe('collections of different accounts', () => {
    it('keeps the collections of two accounts apart', async () => {
      const otherToken = await signUp('second-account')

      await fetch(`${baseUrl}/api/collections`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ collections: [collection] }),
      })

      const other = await fetch(`${baseUrl}/api/collections`, {
        headers: { authorization: `Bearer ${otherToken}` },
      })
      await expect(other.json()).resolves.toEqual({ collections: [] })

      const mine = await fetch(`${baseUrl}/api/collections`, { headers: authHeaders() })
      await expect(mine.json()).resolves.toEqual({ collections: [collection] })
    })
  })
})
