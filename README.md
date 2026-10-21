# Kiwix Collections

Kiwix Collections is a simple interface for curating and sharing collections of references to offline knowledge resources. Collections contain metadata only; this app does not host, copy, or distribute ZIM files.

## Run locally

```sh
npm install
npm run dev
```

Vite prints the local URL in the terminal.

## Checks

```sh
npm test
npm run build
npm run lint
```

Collections are held in memory for the current session. Version 1 JSON manifests can be imported and exported; they contain collection metadata and resource references only, never ZIM file contents. QR sharing and local file inventory are not implemented yet.

## Manifest format

The app uses its own **Kiwix Collections project manifest**, version 1. It is not an official Kiwix standard. The JSON Schema is in [`src/manifest.schema.json`](./src/manifest.schema.json). A manifest requires `schemaVersion`, collection `id`, `name`, `description`, an ISO 8601 `createdAt` timestamp, and a `resources` array. Each resource requires only an `id`, `title`, and `language`; descriptive and file-identifying metadata such as size, filename, ZIM UUID, source URL, and SHA-256 are optional. A source URL is a reference, not proof that a file can be downloaded.
