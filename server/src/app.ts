import express, { type Express } from 'express'
import { createCollectionStore, type CollectionStore } from './collectionStore.js'
import { validateCollectionList } from './manifestValidation.js'

export type AppOptions = {
  store?: CollectionStore
}

export function createApp(options: AppOptions = {}): Express {
  const store = options.store ?? createCollectionStore()
  const app = express()

  app.use(express.json({ limit: '4mb' }))

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.get('/api/collections', (_request, response) => {
    response.json({ collections: store.list() })
  })

  app.put('/api/collections', (request, response) => {
    const body = request.body as { collections?: unknown }
    const result = validateCollectionList(body?.collections)
    if (!result.valid) {
      response.status(400).json({ error: `Invalid collections: ${result.errors.join('; ')}.` })
      return
    }
    response.json({ collections: store.replaceAll(result.collections) })
  })

  app.delete('/api/collections/:id', (request, response) => {
    const removed = store.remove(request.params.id)
    response.json({ removed })
  })

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ error: 'The request body is not valid JSON.' })
      return
    }
    response.status(500).json({ error: 'Unexpected server error.' })
  })

  return app
}
