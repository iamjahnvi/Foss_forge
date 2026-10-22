import { env } from 'node:process'
import { createApp } from './app.js'
import { createDatabase } from './database.js'

const database = createDatabase()
const port = Number(env['API_PORT'] ?? 3001)
const app = createApp({ database })

app.listen(port, '127.0.0.1', () => {
  console.info(`API server listening at http://127.0.0.1:${port}`)
})
