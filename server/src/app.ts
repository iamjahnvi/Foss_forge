import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { createAccountStore, DuplicateEmailError } from './accountStore.js'
import type { AccountRole } from '../../shared/account.js'

// Accounts are created and verified here; the collection data itself stays in
// the user's browser.
export function createApp(): Express {
  const app = express()
  const accounts = createAccountStore()
  app.use(express.json({ limit: '16kb' }))
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
      const user = await accounts.create({ name, email, password, role: role as AccountRole })
      response.status(201).json({ user })
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
      const user = await accounts.authenticate(name, email, password)
      if (!user) {
        response.status(401).json({ error: 'Those name, email, and password details do not match an account.' })
        return
      }
      response.json({ user })
    } catch {
      response.status(500).json({ error: 'Login could not be completed. Please try again.' })
    }
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
