# Kiwix Collections

Kiwix Collections helps you organize and share metadata about offline knowledge resources. It does not upload, host, copy, or distribute ZIM files.

## Run locally

```sh
npm install
npm run dev:server
```

In a second terminal, start the frontend:

```sh
npm run dev
```

Run `npm run dev` in one terminal. Vite serves the frontend and signup API together. Choose **Get started** to create an account with your name, email, password, and sender or recipient role. The server generates a Kiwix ID and hashes the password with bcrypt before saving the account in `server-data/accounts.db`. Use **Login** with your name, email, and password to return to the app. There is no Google sign-in. Collections are saved in this browser's local storage (`kiwix-collections:v1:local`); export a JSON manifest or share a QR code to move them between devices.

## Features

- Create, rename, duplicate, and delete collections.
- Import and export validated JSON manifests.
- Share a manifest as a QR code or scan one with the camera or a picture.
- Scan local ZIM archive metadata and compare it with a collection.
- Check compatibility by ZIM identity, format version, and checksum.

The API exposes `POST /api/auth/signup` for account creation and `GET /api/health` for its liveness check.

The project manifest format is specific to this app and is not an official Kiwix standard. The app writes schema version 2 and reads versions 1 and 2. Its schema and validator are in [`shared/manifest.schema.json`](./shared/manifest.schema.json) and [`shared/manifest.ts`](./shared/manifest.ts).
