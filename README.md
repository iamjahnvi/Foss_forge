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

Vite serves the frontend and account API together. Choose **Get started** to create an account with your name, email, password, and sender or recipient role. The server generates a Kiwix ID and hashes the password with bcrypt before saving the account in `server-data/accounts.db`. Use **Login** with your name, email, and password to return to the app. There is no Google sign-in. Collections are saved in this browser's local storage (`kiwix-collections:v1:local`).

## Features

- Create, rename, duplicate, and delete collections.
- Import and export validated JSON manifests.
- Share a manifest as a QR code or scan one with the camera or a picture.
- Senders can choose a recipient by name, email, and Kiwix ID, then send a collection manifest to that recipient account.
- Recipients can review and import collections from their inbox or from a recipient-only transfer link/QR. The recipient must sign in to view a targeted transfer.
- Scan local ZIM archive metadata and compare it with a collection.
- Check compatibility by ZIM identity, format version, and checksum.

The API exposes `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/recipients`, `POST /api/transfers`, `GET /api/transfers/received`, and `GET /api/transfers/:id`, along with `GET /api/health`. Recipient discovery and transfer routes require a bearer token returned by signup or login. The server stores manifests and account references, never the ZIM archive files.

The project manifest format is specific to this app and is not an official Kiwix standard. The app writes schema version 2 and reads versions 1 and 2. Its schema and validator are in [`shared/manifest.schema.json`](./shared/manifest.schema.json) and [`shared/manifest.ts`](./shared/manifest.ts).
