import { createServer, type Server } from 'node:http'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from './app'
import { createAuthStore } from './authStore'
import { createCollectionStore } from './collectionStore'

const PASSWORD = 'analytical engine'

type AccountDetails = {
  name: string
  email: string
  kiwiId: string
  role: 'sender' | 'receiver'
  password: string
}

// Every test gets its own account, so the tests do not fight over the same
// kiwi id.
let accountCounter = 0

function accountDetails(overrides: Partial<AccountDetails> = {}): AccountDetails {
  accountCounter += 1
  const suffix = String(accountCounter)
  return {
    name: 'Ada Lovelace',
    email: `ada-${suffix}@example.org`,
    kiwiId: `ada-${suffix}`,
    role: 'sender',
    password: PASSWORD,
    ...overrides,
  }
}

describe('the account API', () => {
  let server: Server
  let baseUrl: string

  beforeAll(async () => {
    server = createServer(
      createApp({ store: createCollectionStore(), auth: createAuthStore() }),
    )
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (!address || typeof address === 'string') {
          reject(new Error('Could not determine the auth test server address.'))
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

  async function post(path: string, body: unknown, token?: string) {
    return fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  }

  async function signUp(details: AccountDetails): Promise<{ token: string; kiwiId: string }> {
    const response = await post('/api/auth/signup', details)
    const body = (await response.json()) as { token: string; user: { kiwiId: string } }
    return { token: body.token, kiwiId: body.user.kiwiId }
  }

  describe('POST /api/auth/signup', () => {
    it('creates an account and returns the person and a session token', async () => {
      const response = await post('/api/auth/signup', accountDetails())

      expect(response.status).toBe(201)
      const body = (await response.json()) as {
        user: { name: string; email: string; kiwiId: string; role: string; id: string }
        token: string
      }

      expect(body.user.name).toBe('Ada Lovelace')
      expect(body.user.email).toBe('ada-1@example.org')
      expect(body.user.kiwiId).toBe('ada-1')
      expect(body.user.role).toBe('sender')
      expect(body.user.id).toBeTruthy()
      expect(body.token).toBeTruthy()
    })

    it('keeps the role the person chose', async () => {
      const response = await post('/api/auth/signup', accountDetails({ role: 'receiver' }))
      const body = (await response.json()) as { user: { role: string } }

      expect(body.user.role).toBe('receiver')
    })

    it('never returns the password', async () => {
      const response = await post('/api/auth/signup', accountDetails())
      const body = await response.text()

      expect(body).not.toContain(PASSWORD)
      expect(body).not.toContain('password')
    })

    it('refuses a second account with the same email address', async () => {
      const details = accountDetails()
      expect((await post('/api/auth/signup', details)).status).toBe(201)

      const second = await post('/api/auth/signup', {
        ...details,
        kiwiId: `${details.kiwiId}-two`,
      })

      expect(second.status).toBe(409)
      const body = (await second.json()) as { error: string; field: string }
      expect(body.field).toBe('email')
    })

    it('refuses a second account with the same kiwi id', async () => {
      const details = accountDetails()
      expect((await post('/api/auth/signup', details)).status).toBe(201)

      const second = await post('/api/auth/signup', {
        ...details,
        email: `${details.kiwiId}-two@example.org`,
      })

      expect(second.status).toBe(409)
      const body = (await second.json()) as { error: string; field: string }
      expect(body.field).toBe('kiwiId')
    })

    it('refuses details that are incomplete', async () => {
      const response = await post('/api/auth/signup', { name: 'No Kiwi Id' })

      expect(response.status).toBe(400)
      const body = (await response.json()) as { error: string }
      expect(body.error.length).toBeGreaterThan(0)
    })

    it('refuses a kiwi id that is not made of safe characters', async () => {
      const response = await post('/api/auth/signup', {
        ...accountDetails(),
        kiwiId: 'not a kiwi id!',
      })

      expect(response.status).toBe(400)
    })

    it('refuses a password that is too short', async () => {
      const response = await post('/api/auth/signup', {
        ...accountDetails(),
        password: 'abc',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('signs in with the kiwi id', async () => {
      const details = accountDetails()
      await post('/api/auth/signup', details)

      const response = await post('/api/auth/login', {
        identifier: details.kiwiId,
        password: PASSWORD,
      })

      expect(response.status).toBe(200)
      const body = (await response.json()) as { user: { kiwiId: string }; token: string }
      expect(body.user.kiwiId).toBe(details.kiwiId)
      expect(body.token).toBeTruthy()
    })

    it('signs in with the email address', async () => {
      const details = accountDetails()
      await post('/api/auth/signup', details)

      const response = await post('/api/auth/login', {
        identifier: details.email.toUpperCase(),
        password: PASSWORD,
      })

      expect(response.status).toBe(200)
    })

    it('refuses the wrong password', async () => {
      const details = accountDetails()
      await post('/api/auth/signup', details)

      const response = await post('/api/auth/login', {
        identifier: details.kiwiId,
        password: 'difference engine',
      })

      expect(response.status).toBe(401)
      const body = (await response.json()) as { error: string }
      expect(body.error).toContain('wrong')
    })

    it('refuses an account that does not exist', async () => {
      const response = await post('/api/auth/login', {
        identifier: 'nobody',
        password: PASSWORD,
      })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns the account of the session', async () => {
      const { token, kiwiId } = await signUp(accountDetails())

      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.status).toBe(200)
      const body = (await response.json()) as { user: { kiwiId: string } }
      expect(body.user.kiwiId).toBe(kiwiId)
    })

    it('refuses a request without a session', async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`)

      expect(response.status).toBe(401)
    })

    it('refuses a session that was closed', async () => {
      const { token } = await signUp(accountDetails())

      await post('/api/auth/signout', {}, token)

      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { authorization: `Bearer ${token}` },
      })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/auth/signout', () => {
    it('closes the session', async () => {
      const { token } = await signUp(accountDetails())

      const response = await post('/api/auth/signout', {}, token)
      expect(response.status).toBe(200)

      const me = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { authorization: `Bearer ${token}` },
      })
      expect(me.status).toBe(401)
    })
  })
})
