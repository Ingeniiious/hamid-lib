import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = "hamid-lib-assets";
const CDN_BASE = "https://lib.thevibecodedcompany.com";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.CF_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  fileBuffer: Uint8Array,
  objectKey: string,
  contentType: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: contentType,
      })
    );

    return { success: true, url: `${CDN_BASE}/${objectKey}` };
  } catch (e) {
    return { success: false, error: `R2 upload error: ${(e as Error).message}` };
  }
}

export async function deleteFromR2(objectKey: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: objectKey,
      })
    );
  } catch {
    // Best-effort deletion
  }
}

export async function downloadFromR2(
  objectKey: string
): Promise<{ success: true; data: Buffer; contentType: string } | { success: false; error: string }> {
  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: objectKey,
      })
    );

    if (!response.Body) {
      return { success: false, error: "Empty response body from R2" };
    }

    const bytes = await response.Body.transformToByteArray();
    const contentType = response.ContentType ?? "application/octet-stream";

    return { success: true, data: Buffer.from(bytes), contentType };
  } catch (e) {
    return { success: false, error: `R2 download error: ${(e as Error).message}` };
  }
}
