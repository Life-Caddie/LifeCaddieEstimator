# Azure Blob Upload (src/lib/azureStorage.ts)

This project includes a small helper for uploading images to Azure Blob Storage: `src/lib/azureStorage.ts`.

Summary
- Purpose: provide a single server-side helper `uploadImage(containerName, blobName, data, contentType)` that ensures the container exists and uploads binary data.
- Location: [src/lib/azureStorage.ts](src/lib/azureStorage.ts)

Supported authentication methods (in order of precedence)

1. `AZURE_STORAGE_CONNECTION_STRING` — full connection string (recommended for local dev).
2. `AZURE_STORAGE_ACCOUNT_NAME` + `AZURE_STORAGE_ACCOUNT_KEY` — account key using `StorageSharedKeyCredential`.
3. `AZURE_STORAGE_ACCOUNT_NAME` + `AZURE_STORAGE_SAS_TOKEN` — account-level SAS token appended to the account URL. The helper accepts a token with or without a leading `?`.
4. `AZURE_STORAGE_ACCOUNT_NAME` + Azure AD credentials (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_CLIENT_SECRET`) — uses `DefaultAzureCredential`.

Notes
- The helper constructs the Blob service client using the chosen auth method and calls `container.createIfNotExists({ access: 'container' })`. `access: 'container'` will allow anonymous read access to blobs in that container; if you need private containers, change this option accordingly.
- When using a SAS token, ensure the token is valid for the account endpoint and for the operations you need (create container, write blobs).

Example `.env.local` snippets

Connection string (local dev):

AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net

Account key (preferred for scripts/service accounts):

AZURE_STORAGE_ACCOUNT_NAME=youraccountname
AZURE_STORAGE_ACCOUNT_KEY=base64-or-key-string

SAS token (no leading `?` required):

AZURE_STORAGE_ACCOUNT_NAME=youraccountname
AZURE_STORAGE_SAS_TOKEN=sv=2024-...&ss=b&srt=sco&sp=rlx&se=2026-01-01T00:00:00Z&st=2025-12-01T00:00:00Z&spr=https&sig=...

Azure AD (managed identity / service principal):

AZURE_STORAGE_ACCOUNT_NAME=youraccountname
AZURE_CLIENT_ID=...
AZURE_TENANT_ID=...
AZURE_CLIENT_SECRET=...

Usage example (server-side Next.js API route)

import storage from '../src/lib/azureStorage';

// `photo` is a File-like object (e.g. from a form upload handled server-side)
const buf = Buffer.from(await photo.arrayBuffer());
const { url } = await storage.uploadImage('uploads', `${Date.now()}-${photo.name}`, buf, photo.type);

The returned `url` is the blob URL (public if the container access level allows it).

Troubleshooting
- 401 / 403 errors: verify which auth method is active and that the credentials/token grant the required permissions.
- SAS issues: ensure the token scope includes write/create and the token hasn't expired.
- Container visibility: if you need private blobs, remove or change the `access` option passed to `createIfNotExists`.
- For local testing, using `AZURE_STORAGE_CONNECTION_STRING` is simplest.

Where to look in the code
- Helper implementation: [src/lib/azureStorage.ts](src/lib/azureStorage.ts)
- Example client usage in repo: see `test_analyze_upload.js` for how uploads are exercised in tests.

If you'd like, I can:
- Add a short link to this doc from the project README.
- Change the container creation access level to `private` and add an option to `uploadImage` to control it.
