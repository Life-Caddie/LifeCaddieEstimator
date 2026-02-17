import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

/**
 * Azure Blob Storage helper
 * - Supports connection string, account/key, or Azure AD (DefaultAzureCredential).
 * - Exports `uploadImage` which ensures the container exists and uploads binary data.
 *
 * Env vars supported (in order):
 * - `AZURE_STORAGE_CONNECTION_STRING`
 * - `AZURE_STORAGE_ACCOUNT_NAME` + `AZURE_STORAGE_ACCOUNT_KEY`
 * - `AZURE_STORAGE_ACCOUNT_NAME` + AZURE AD creds (AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET)
 */

function getAccountUrl(account: string) {
  return `https://${account}.blob.core.windows.net`;
}

function getBlobServiceClient(): BlobServiceClient {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const key = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (conn) {
    return BlobServiceClient.fromConnectionString(conn);
  }

  if (account && key) {
    const cred = new StorageSharedKeyCredential(account, key);
    return new BlobServiceClient(getAccountUrl(account), cred);
  }

  if (account) {
    // Attempt Azure AD authentication via DefaultAzureCredential
    const cred = new DefaultAzureCredential();
    return new BlobServiceClient(getAccountUrl(account), cred);
  }

  throw new Error(
    "No Azure Storage credentials found. Set AZURE_STORAGE_CONNECTION_STRING, or AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY, or AZURE AD creds."
  );
}

export async function uploadImage(
  containerName: string,
  blobName: string,
  data: Buffer | Uint8Array | ArrayBuffer,
  contentType?: string
): Promise<{ url: string }> {
  const svc = getBlobServiceClient();
  const container = svc.getContainerClient(containerName);

  // Create container if it doesn't exist (no-op if exists)
  await container.createIfNotExists();

  const blockBlob = container.getBlockBlobClient(blobName);

  await blockBlob.uploadData(data, {
    blobHTTPHeaders: { blobContentType: contentType || "application/octet-stream" },
  });

  return { url: blockBlob.url };
}

// Example usage (server-side):
// const buf = Buffer.from(await photo.arrayBuffer());
// await uploadImage('uploads', `${Date.now()}-${photo.name}`, buf, photo.type);

export default { uploadImage };
