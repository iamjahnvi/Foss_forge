# Kiwix Collections

Kiwix Collections is a simple interface for curating and sharing collections of references to offline knowledge resources. Collections contain metadata only; this app does not host, copy, or distribute ZIM files.

## Run locally

Start the API and frontend in separate terminals from the project root:

```sh
npm run dev:server
npm run dev
```

The API listens only on `127.0.0.1:3001`. Vite prints the frontend URL and proxies `/api` requests to the API. Check `GET /api/health` directly at `http://127.0.0.1:3001/api/health`.

The frontend also works without the API. When `/api` is unreachable the app says so and keeps the collection list in the browser's local storage instead.

## Checks

```sh
npm test
npm run build
npm run lint
```

## What the app does

- **Collections** — create, rename, duplicate and delete collections. Open a collection to edit its resources: title, language, description, source URL, and the order they are listed in.
- **Local Inventory** — scan the ZIM archives you already own. The browser reads the 80-byte archive header and the trailing checksum, and records the UUID, format version, article count, language guess and size. Files never leave the machine. Scanned archives can be added to a collection as a resource.
- **Import / Export** — export a collection as a version 1 JSON manifest, and import a manifest to preview and add it.
- **Share QR** — encode the whole manifest in a QR code. Another device can scan it, recover the JSON and import the collection.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check. |
| `GET` | `/api/collections` | Return the stored collection list. |
| `PUT` | `/api/collections` | Replace the stored collection list. Every collection is validated against the manifest schema. |
| `DELETE` | `/api/collections/:id` | Remove one collection. |

The API keeps collections in memory for the lifetime of the process. The browser keeps its own copy and re-sends the full list on every change, so restarting the API does not lose data.

## Manifest format

The app uses its own **Kiwix Collections project manifest**, version 1. It is not an official Kiwix standard. The canonical JSON Schema and Ajv validator are in [`shared/manifest.schema.json`](./shared/manifest.schema.json) and [`shared/manifest.ts`](./shared/manifest.ts), and are shared by the frontend and backend. A manifest requires `schemaVersion`, collection `id`, `name`, `description`, an ISO 8601 `createdAt` timestamp, and a `resources` array. Each resource requires only an `id`, `title`, and `language`; descriptive and file-identifying metadata such as size, filename, ZIM UUID, source URL, and SHA-256 are optional. A source URL is a reference, not proof that a file can be downloaded.
