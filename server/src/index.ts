import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { env } from 'node:process'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createApp } from './app.js'

// One process serves the API and, when it has been built, the frontend.
// Locally the API listens on 127.0.0.1:3001 (the Vite dev server proxies to
// it). On a host such as Render, PORT is set and the server binds 0.0.0.0.
const app = createApp()

const here = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(env['STATIC_DIR'] ?? findDist(here))

// Unknown API paths answer in JSON, like the rest of the API.
app.use('/api', (_request, response) => {
  response.status(404).json({ error: 'There is no such API route.' })
})

if (existsSync(resolve(distDir, 'index.html'))) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }))
  app.get(/.*/, (_request, response) => {
    response.sendFile(resolve(distDir, 'index.html'))
  })
}

const port = Number(env['PORT'] ?? env['API_PORT'] ?? 3001)
const host = env['HOST'] ?? (env['PORT'] ? '0.0.0.0' : '127.0.0.1')

app.listen(port, host, () => {
  console.info(`Kiwix Collections listening at http://${host}:${port}`)
})

// The compiled server lives in dist-server/server/src, the source in
// server/src; both sit below the project root that holds dist/.
function findDist(start: string): string {
  let current = start
  for (let step = 0; step < 5; step += 1) {
    const candidate = resolve(current, 'dist')
    if (existsSync(resolve(candidate, 'index.html'))) return candidate
    current = dirname(current)
  }
  return resolve(process.cwd(), 'dist')
}
