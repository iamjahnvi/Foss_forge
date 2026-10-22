# Kiwix Collections

Kiwix Collections helps you organize and share metadata about offline knowledge resources. It does not upload, host, copy, or distribute ZIM files.

## Run locally

```sh
npm install
npm run dev
```

There are no accounts or sign-in steps. Collections are saved in this browser's local storage (`kiwix-collections:v1:local`). Export a JSON manifest or share a QR code to move collections between devices. The API server is optional and only provides `GET /api/health`.

## Features

- Create, rename, duplicate, and delete collections.
- Import and export validated JSON manifests.
- Share a manifest as a QR code or scan one with the camera or a picture.
- Scan local ZIM archive metadata and compare it with a collection.
- Check compatibility by ZIM identity, format version, and checksum.

The project manifest format is specific to this app and is not an official Kiwix standard. The app writes schema version 2 and reads versions 1 and 2. Its schema and validator are in [`shared/manifest.schema.json`](./shared/manifest.schema.json) and [`shared/manifest.ts`](./shared/manifest.ts).
