// ---------------------------------------------------------------------------
// Image Preparation for Kimi K2.5 Multimodal
// Resizes and optimizes images before sending to the Kimi vision API.
// Per Kimi docs: max 4K (4096x2160), supported formats: png, jpeg, webp, gif
// ---------------------------------------------------------------------------

import sharp from "sharp";
import type { ExtractedImage } from "./types";

/** Max dimensions per Kimi docs recommendations */
const MAX_WIDTH = 4096;
const MAX_HEIGHT = 2160;

/** Max size for base64 in request body (aim for ~5MB per image to stay under 100MB total) */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Prepare an image for Kimi K2.5 multimodal API.
 * Resizes to max 4K, converts to JPEG for smaller size, returns base64.
 */
export async function prepareImageForKimi(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<{ base64: string; mimeType: string; width: number; height: number }> {
  let processor = sharp(imageBuffer);
  const metadata = await processor.metadata();

  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  // Resize if exceeds Kimi's recommended max
  if (originalWidth > MAX_WIDTH || originalHeight > MAX_HEIGHT) {
    processor = processor.resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  // Convert to JPEG for smaller payload (unless it's already small)
  // GIF and PNG with transparency keep their format
  const isTransparent = mimeType === "image/png" || mimeType === "image/gif";
  let outputBuffer: Buffer;
  let outputMimeType: string;

  if (isTransparent) {
    outputBuffer = await processor.png({ quality: 80 }).toBuffer();
    outputMimeType = "image/png";
  } else {
    outputBuffer = await processor.jpeg({ quality: 85 }).toBuffer();
    outputMimeType = "image/jpeg";
  }

  // If still too large, reduce quality further
  if (outputBuffer.length > MAX_IMAGE_BYTES) {
    if (isTransparent) {
      outputBuffer = await sharp(imageBuffer)
        .resize(2048, 1080, { fit: "inside", withoutEnlargement: true })
        .png({ quality: 60 })
        .toBuffer();
    } else {
      outputBuffer = await sharp(imageBuffer)
        .resize(2048, 1080, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 60 })
        .toBuffer();
    }
  }

  const outputMetadata = await sharp(outputBuffer).metadata();

  return {
    base64: outputBuffer.toString("base64"),
    mimeType: outputMimeType,
    width: outputMetadata.width ?? originalWidth,
    height: outputMetadata.height ?? originalHeight,
  };
}

/**
 * Prepare a batch of ExtractedImages for Kimi.
 * Returns prepared images with updated base64 data.
 */
export async function prepareImagesForKimi(
  images: ExtractedImage[],
): Promise<ExtractedImage[]> {
  const prepared: ExtractedImage[] = [];

  for (const img of images) {
    try {
      const buffer = Buffer.from(img.base64, "base64");
      const result = await prepareImageForKimi(buffer, img.mimeType);
      prepared.push({
        ...img,
        base64: result.base64,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height,
      });
    } catch {
      // Skip images that fail to process
    }
  }

  return prepared;
}

/**
 * Convert a raw image file (from contribution upload) to an ExtractedImage.
 */
export async function fileToExtractedImage(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractedImage> {
  const result = await prepareImageForKimi(buffer, mimeType);
  return {
    base64: result.base64,
    mimeType: result.mimeType,
    pageOrSlide: 1,
    width: result.width,
    height: result.height,
  };
}
