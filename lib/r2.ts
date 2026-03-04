const CF_ACCOUNT_ID = "8853294910dc897873b7eaec2034c4d7";
const CF_R2_API_TOKEN = process.env.CF_R2_API_TOKEN!;
const BUCKET = "hamid-lib-assets";
const CDN_BASE = "https://lib.thevibecodedcompany.com";

export async function uploadToR2(
  fileBuffer: Uint8Array,
  objectKey: string,
  contentType: string
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(objectKey)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${CF_R2_API_TOKEN}`,
          "Content-Type": contentType,
        },
        body: fileBuffer as unknown as BodyInit,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `R2 upload failed (${res.status}): ${text}` };
    }

    return { success: true, url: `${CDN_BASE}/${objectKey}` };
  } catch (e) {
    return { success: false, error: `R2 upload error: ${(e as Error).message}` };
  }
}

export async function deleteFromR2(objectKey: string): Promise<void> {
  try {
    await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(objectKey)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${CF_R2_API_TOKEN}`,
        },
      }
    );
  } catch {
    // Best-effort deletion
  }
}
