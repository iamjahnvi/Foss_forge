import { env } from 'node:process'
import { createApp } from './app.js'
const port = Number(env['API_PORT'] ?? 3001)
const app = createApp()

app.listen(port, '127.0.0.1', () => {
  console.info(`API server listening at http://127.0.0.1:${port}`)
})
