# Kiwix Collections

Kiwix Collections is a simple interface for curating and sharing collections of references to offline knowledge resources. Collections contain metadata only; this app does not host, copy, or distribute ZIM files.

## Run locally

Start the API and frontend in separate terminals from the project root:

```sh
npm run dev:server
```

```sh
npm run dev
```

The API listens only on `127.0.0.1:3001`. Vite prints the frontend URL and proxies `/api` requests to the API. Check `GET /api/health` directly at `http://127.0.0.1:3001/api/health`.

## Checks

```sh
npm test
npm run build
npm run lint
```

Collections are held in memory for the current session. Version 1 JSON manifests can be imported and exported; they contain collection metadata and resource references only, never ZIM file contents. QR sharing and local file inventory are not implemented yet.

## Manifest format

The app uses its own **Kiwix Collections project manifest**, version 1. It is not an official Kiwix standard. The canonical JSON Schema and Ajv validator are in [`shared/manifest.schema.json`](./shared/manifest.schema.json) and [`shared/manifest.ts`](./shared/manifest.ts), and are shared by the frontend and backend. A manifest requires `schemaVersion`, collection `id`, `name`, `description`, an ISO 8601 `createdAt` timestamp, and a `resources` array. Each resource requires only an `id`, `title`, and `language`; descriptive and file-identifying metadata such as size, filename, ZIM UUID, source URL, and SHA-256 are optional. A source URL is a reference, not proof that a file can be downloaded.
