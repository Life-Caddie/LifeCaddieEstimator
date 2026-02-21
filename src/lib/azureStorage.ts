import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

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
    const cred = new DefaultAzureCredential();
    return new BlobServiceClient(getAccountUrl(account), cred);
  }

  throw new Error(
    "No Azure Storage credentials found. Set AZURE_STORAGE_CONNECTION_STRING, or AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY, or AZURE AD creds."
  );
}

export async function uploadBlob(
  containerName: string,
  blobName: string,
  data: Buffer | Uint8Array | ArrayBuffer,
  contentType?: string
): Promise<{ url: string }> {
  const svc = getBlobServiceClient();
  const container = svc.getContainerClient(containerName);
  await container.createIfNotExists();

  const blockBlob = container.getBlockBlobClient(blobName);
  await blockBlob.uploadData(data, {
    blobHTTPHeaders: { blobContentType: contentType || "application/octet-stream" },
  });

  return { url: blockBlob.url };
}
