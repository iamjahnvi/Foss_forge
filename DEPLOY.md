# Deploying Kiwix Collections

In production one Node process serves the built frontend (`dist/`) and the
`/api` routes. There is no database: collections live in each visitor's
browser storage, so the service is stateless.

```bash
npm ci
npm run build        # frontend -> dist/, server -> dist-server/
PORT=3000 npm start  # http://0.0.0.0:3000
```

## Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3001` (`API_PORT` also works) | Port to listen on. Render and Railway set it. |
| `HOST` | `0.0.0.0` when `PORT` is set, else `127.0.0.1` | Interface to bind. |
| `STATIC_DIR` | the `dist/` next to the project | Built frontend to serve. |
| `NODE_VERSION` (Render only) | — | Node major version, `22`. |

## Render

1. Push the repository to GitHub (Render deploys from a repo and branch, here `main`).
2. In Render choose **New → Blueprint** and pick the repo. `render.yaml` creates a
   free Node web service that builds with `npm ci && npm run build`, starts with
   `npm start` and checks `/api/health`.
3. Free services sleep when idle; the first request after a pause is slow.

Or use **New → Web Service → Docker** with the `Dockerfile`.

## Railway

Create a service from the repo; it uses the `Dockerfile`. Railway sets `PORT`.

## Docker locally

```bash
docker build -t kiwix-collections .
docker run -p 3000:3000 kiwix-collections
```

## Routes

- `/` landing page, `/#/how-kiwix-works` explainer, `/#/app` the collections app.
- `/api/health` liveness check.
