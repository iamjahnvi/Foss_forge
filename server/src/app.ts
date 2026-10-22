import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { createAccountStore, DuplicateEmailError } from './accountStore.js'
import type { AccountRole } from '../../shared/account.js'
import { validateManifestData } from '../../shared/manifest.js'

// Accounts are created and verified here; the collection data itself stays in
// the user's browser.
export function createApp(): Express {
  const app = express()
  const accounts = createAccountStore()
  app.use(express.json({ limit: '4mb' }))
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' })
  })
  app.post('/api/auth/signup', async (request, response) => {
    const body = request.body as Record<string, unknown> | null
    const name = typeof body?.['name'] === 'string' ? body['name'].trim() : ''
    const email = typeof body?.['email'] === 'string' ? body['email'].trim() : ''
    const password = typeof body?.['password'] === 'string' ? body['password'] : ''
    const role = body?.['role']

    if (name.length < 2 || name.length > 100) {
      response.status(400).json({ error: 'Enter a name between 2 and 100 characters.' })
      return
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      response.status(400).json({ error: 'Enter a valid email address.' })
      return
    }
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      response.status(400).json({ error: 'Use a password with at least 8 characters and no more than 72 bytes.' })
      return
    }
    if (role !== 'sender' && role !== 'recipient') {
      response.status(400).json({ error: 'Choose sender or recipient as your role.' })
      return
    }

    try {
      const result = await accounts.create({ name, email, password, role: role as AccountRole })
      response.status(201).json(result)
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        response.status(409).json({ error: error.message })
        return
      }
      response.status(500).json({ error: 'The account could not be created. Please try again.' })
    }
  })
  app.post('/api/auth/login', async (request, response) => {
    const body = request.body as Record<string, unknown> | null
    const name = typeof body?.['name'] === 'string' ? body['name'].trim() : ''
    const email = typeof body?.['email'] === 'string' ? body['email'].trim() : ''
    const password = typeof body?.['password'] === 'string' ? body['password'] : ''
    if (!name || !email || !password) {
      response.status(400).json({ error: 'Enter your name, email address, and password.' })
      return
    }

    try {
      const result = await accounts.authenticate(name, email, password)
      if (!result) {
        response.status(401).json({ error: 'Those name, email, and password details do not match an account.' })
        return
      }
      response.json(result)
    } catch {
      response.status(500).json({ error: 'Login could not be completed. Please try again.' })
    }
  })
  type AuthRequest = Request & { account?: import('../../shared/account.js').AccountProfile }
  const requireAccount = (request: Request, response: Response, next: NextFunction) => {
    const auth = request.get('authorization') ?? ''
    const match = /^Bearer\s+(.+)$/i.exec(auth)
    const account = match ? accounts.userForToken(match[1]!) : null
    if (!account) {
      response.status(401).json({ error: 'Sign in to use recipient transfers.' })
      return
    }
    ;(request as AuthRequest).account = account
    next()
  }
  app.get('/api/recipients', requireAccount, (request, response) => {
    const account = (request as AuthRequest).account!
    if (account.role !== 'sender') {
      response.status(403).json({ error: 'Recipient accounts cannot browse the recipient pool.' })
      return
    }
    response.json({ recipients: accounts.listRecipients() })
  })
  app.post('/api/transfers', requireAccount, (request, response) => {
    const account = (request as AuthRequest).account!
    if (account.role !== 'sender') {
      response.status(403).json({ error: 'Only sender accounts can send collections.' })
      return
    }
    const body = request.body as Record<string, unknown> | null
    const kiwiId = typeof body?.['recipientKiwiId'] === 'string' ? body['recipientKiwiId'] : ''
    const parsed = validateManifestData(body?.['collection'])
    if (!kiwiId.trim() || !parsed.valid) {
      response.status(400).json({ error: parsed.valid ? 'Choose a recipient.' : `Invalid collection manifest: ${parsed.errors.join('; ')}` })
      return
    }
    try {
      response.status(201).json({ transfer: accounts.sendCollection(account, kiwiId, parsed.manifest) })
    } catch (error) {
      response.status(404).json({ error: error instanceof Error ? error.message : 'Recipient not found.' })
    }
  })
  app.get('/api/transfers/received', requireAccount, (request, response) => {
    response.json({ transfers: accounts.listReceived((request as AuthRequest).account!) })
  })
  app.get('/api/transfers/unread', requireAccount, (request, response) => {
    response.json({ transfers: accounts.listUnread((request as AuthRequest).account!) })
  })
  app.post('/api/transfers/:id/read', requireAccount, (request, response) => {
    const rawId = request.params['id']
    const account = (request as AuthRequest).account!
    const marked = accounts.markReceivedRead(account, typeof rawId === 'string' ? rawId : '')
    if (!marked) {
      response.status(404).json({ error: 'This unread transfer was not found for your recipient account.' })
      return
    }
    response.json({ status: 'read' })
  })
  app.get('/api/transfers/:id', requireAccount, (request, response) => {
    const rawId = request.params['id']
    const transfer = accounts.getReceived((request as AuthRequest).account!, typeof rawId === 'string' ? rawId : '')
    if (!transfer) {
      response.status(404).json({ error: 'This transfer was not found for your recipient account.' })
      return
    }
    response.json({ transfer })
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
