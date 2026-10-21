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

- **Collections** — create, rename, duplicate and delete collections. Open a collection to edit its resources: title, language, description, source URL, and the order they are listed in. Every resource carries a badge that says whether the archive it describes is on this machine.
- **Local Inventory** — scan the ZIM archives you already own. The browser reads the 80-byte archive header and the trailing checksum, and records the UUID, format version, article count, language guess and size. Files never leave the machine. Scanned archives can be added to a collection as a resource.
- **Import / Export** — export a collection as a JSON manifest, and import a manifest to preview it. The preview runs the compatibility report before anything is saved.
- **Share QR** — encode the whole manifest in a QR code. Another device can scan it, recover the JSON and import the collection.

## Compatibility report

The compatibility engine compares a manifest with the archives on the machine. Archives are matched by their ZIM UUID first, then by their ZIM format version, and finally by the checksum stored inside the archive. The filename is never used to decide a match: a file called `wikipedia_en_all.zim` can hold a different snapshot, and two archives of the same content can carry different names.

Every resource ends up in one of five states:

| State | Meaning |
| --- | --- |
| Present & verified | The archive is on this machine and its checksum agrees with the manifest. |
| Missing | No archive on this machine has the ZIM identity the manifest describes. |
| Different version | The archive is here, but in another ZIM format version. |
| Integrity mismatch | The archive is here, but its checksum differs, so it is not the archive the manifest describes. |
| Unknown / incompatible | The resource records no ZIM identity, or the local archive uses a format version the app does not understand. |

The engine lives in [`src/compatibility.ts`](./src/compatibility.ts) and its test evidence in [`src/compatibility.test.ts`](./src/compatibility.test.ts).

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check. |
| `GET` | `/api/collections` | Return the stored collection list. |
| `PUT` | `/api/collections` | Replace the stored collection list. Every collection is validated against the manifest schema. |
| `DELETE` | `/api/collections/:id` | Remove one collection. |

The API keeps collections in memory for the lifetime of the process. The browser keeps its own copy and re-sends the full list on every change, so restarting the API does not lose data.

## Manifest format

The app uses its own **Kiwix Collections project manifest**. It is not an official Kiwix standard. The canonical JSON Schema and Ajv validator are in [`shared/manifest.schema.json`](./shared/manifest.schema.json) and [`shared/manifest.ts`](./shared/manifest.ts), and are shared by the frontend and backend. A manifest requires `schemaVersion`, collection `id`, `name`, `description`, an ISO 8601 `createdAt` timestamp, and a `resources` array. Each resource requires only an `id`, `title`, and `language`; descriptive and file-identifying metadata such as size, filename, ZIM UUID, source URL, and SHA-256 are optional. A source URL is a reference, not proof that a file can be downloaded.

### Versions

| Version | Change |
| --- | --- |
| 1 | The original format: a collection with resources that carry optional descriptive metadata. |
| 2 | Adds `zimVersion` and `zimChecksum` to a resource, so a receiving app can tell whether a local archive is the one the manifest describes. |

The app writes version 2 and reads version 1 and version 2. A version 1 resource records no format version and no checksum, so it can only be matched by its ZIM identity.
