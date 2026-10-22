import express, { type Express, type NextFunction, type Request, type Response } from 'express'

// The server only provides a liveness endpoint. Collections are stored in the
// browser, so no account, session, or transfer endpoints are needed.
export function createApp(): Express {
  const app = express()
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' })
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
