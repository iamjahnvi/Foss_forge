import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { createAuthStore, DuplicateAccountError, type AuthStore } from './authStore.js'
import { createCollectionStore, type CollectionStore } from './collectionStore.js'
import { createDatabase, type Database } from './database.js'
import { createTransferStore, type TransferStore } from './transferStore.js'
import { validateCollectionList } from './manifestValidation.js'
import {
  validateLoginInput,
  validateSignUpInput,
  type AuthUser,
} from '../../shared/auth.js'

export type AppOptions = {
  database?: Database
  store?: CollectionStore
  auth?: AuthStore
  transfers?: TransferStore
}

export function createApp(options: AppOptions = {}): Express {
  const database = options.database ?? createDatabase()
  const store = options.store ?? createCollectionStore(database)
  const auth = options.auth ?? createAuthStore(database)
  const transfers = options.transfers ?? createTransferStore(database)
  const app = express()

  app.use(express.json({ limit: '4mb' }))

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.post('/api/auth/signup', (request, response) => {
    const result = validateSignUpInput(request.body)
    if (!result.valid) {
      response.status(400).json({ error: result.errors.join(' ') })
      return
    }

    auth
      .createUser(result.value)
      .then((user) => {
        const token = auth.startSession(user.id)
        response.status(201).json({ user, token })
      })
      .catch((error: unknown) => {
        if (error instanceof DuplicateAccountError) {
          response.status(409).json({ error: error.message, field: error.field })
          return
        }
        response.status(500).json({ error: 'The account could not be created.' })
      })
  })

  app.post('/api/auth/login', (request, response) => {
    const result = validateLoginInput(request.body)
    if (!result.valid) {
      response.status(400).json({ error: result.errors.join(' ') })
      return
    }

    auth
      .authenticate(result.value.identifier, result.value.password)
      .then((user) => {
        if (!user) {
          response.status(401).json({ error: 'That kiwi id, email address or password is wrong.' })
          return
        }
        response.json({ user, token: auth.startSession(user.id) })
      })
      .catch(() => {
        response.status(500).json({ error: 'The sign in could not be completed.' })
      })
  })

  app.get('/api/auth/me', requireUser(auth), (request, response) => {
    response.json({ user: request.user ?? null })
  })

  app.post('/api/auth/signout', requireUser(auth), (request, response) => {
    const token = bearerToken(request)
    if (token) auth.endSession(token)
    response.json({ signedOut: true })
  })

  // Find an account by its kiwi id so a sender can choose who to send a
  // collection to.
  app.get('/api/accounts/by-kiwi/:kiwiId', requireUser(auth), (request, response) => {
    const user = auth.findByKiwiId(String(request.params.kiwiId))
    if (!user) {
      response.status(404).json({ error: 'There is no account with that kiwi id.' })
      return
    }
    response.json({ user: { id: user.id, name: user.name, kiwiId: user.kiwiId, role: user.role } })
  })

  // The people a sender can send a collection to: the receiver accounts.
  app.get('/api/accounts/receivers', requireUser(auth), (_request, response) => {
    const receivers = auth
      .listAccounts()
      .filter((user) => user.role === 'receiver')
      .map((user) => ({ id: user.id, name: user.name, kiwiId: user.kiwiId, role: user.role }))
    response.json({ receivers })
  })

  app.get('/api/collections', requireUser(auth), (request, response) => {
    response.json({ collections: store.list(userId(request)) })
  })

  app.post('/api/collections', requireUser(auth), (request, response) => {
    const body = request.body as { collections?: unknown }
    const result = validateCollectionList(body?.collections)
    if (!result.valid) {
      response.status(400).json({ error: `Invalid collections: ${result.errors.join('; ')}.` })
      return
    }
    response.json({ collections: store.replaceAll(userId(request), result.collections) })
  })

  app.delete('/api/collections/:id', requireUser(auth), (request, response) => {
    const removed = store.remove(userId(request), String(request.params.id))
    response.json({ removed })
  })

  // A sender sends one of their own collections to another account.
  app.post('/api/transfers', requireUser(auth), (request, response) => {
    const senderId = userId(request)
    const body = request.body as { collectionId?: unknown; recipientId?: unknown }
    const collectionId = typeof body.collectionId === 'string' ? body.collectionId : ''
    const recipientId = typeof body.recipientId === 'string' ? body.recipientId : ''

    if (!collectionId || !recipientId) {
      response.status(400).json({ error: 'Choose a collection and a recipient.' })
      return
    }

    const collection = store.find(senderId, collectionId)
    if (!collection) {
      response.status(404).json({ error: 'That collection was not found.' })
      return
    }

    const recipient = auth.findByIdentifier ? auth.findByIdentifier(recipientId) : undefined
    if (!recipient && auth.findByKiwiId) {
      // The recipient may be looked up by id or by kiwi id.
    }

    // The sender must choose a known recipient account. The recipient can be
    // given by their account id or by their kiwi id.
    const recipientAccount =
      auth.listAccounts().find((account) => account.id === recipientId) ??
      (auth.findByKiwiId ? auth.findByKiwiId(recipientId) : undefined)

    if (!recipientAccount) {
      response.status(404).json({ error: 'There is no account to send this collection to.' })
      return
    }

    // A sender can only send to a receiver, because the flow is designed for
    // that pairing.
    if (recipientAccount.role !== 'receiver') {
      response.status(400).json({ error: 'Collections can only be sent to accounts that are receivers.' })
      return
    }

    try {
      const transfer = transfers.send(senderId, recipientAccount.id, collection)
      response.status(201).json({ transfer })
    } catch {
      response.status(500).json({ error: 'The collection could not be sent.' })
    }
  })

  // A receiver looks at the collections that were sent to them.
  app.get('/api/transfers/received', requireUser(auth), (request, response) => {
    response.json({ transfers: transfers.received(userId(request)) })
  })

  // A sender looks at the collections they have sent.
  app.get('/api/transfers/sent', requireUser(auth), (request, response) => {
    response.json({ transfers: transfers.sent(userId(request)) })
  })

  // A receiver marks a transfer as read.
  app.post('/api/transfers/:id/read', requireUser(auth), (request, response) => {
    const read = transfers.markRead(String(request.params.id), userId(request))
    response.json({ read })
  })

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ error: 'The request body is not valid JSON.' })
      return
    }
    response.status(500).json({ error: 'Unexpected server error.' })
  })

  return app
}

function bearerToken(request: Request): string | null {
  const header = request.header('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!token || scheme.toLowerCase() !== 'bearer') return null
  return token.trim() || null
}

// The account of the person making the request. The route that uses it always
// runs behind `requireUser`, so it is always there.
function userId(request: Request): string {
  return request.user?.id ?? ''
}

// Every route that works with somebody's own data needs to know who is
// asking, so the session token is turned into the account here.
function requireUser(auth: AuthStore) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const token = bearerToken(request)
    const user: AuthUser | undefined = token ? auth.userForToken(token) : undefined

    if (!user) {
      response.status(401).json({ error: 'Sign in to use this part of the app.' })
      return
    }

    request.user = user
    next()
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}
