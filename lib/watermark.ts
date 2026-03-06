import { PDFDocument, rgb } from "pdf-lib";
// @ts-ignore @pdf-lib/fontkit has no type declarations
import fontkit from "@pdf-lib/fontkit";
import sharp from "sharp";
import { readFile } from "fs/promises";
import { join } from "path";

const WATERMARK_TEXT = "libraryyy.com";
const FONT_PATH = join(process.cwd(), "public/fonts/cooper-bt-light.otf");

// Cache the font bytes in memory after first load
let fontBytesCache: Buffer | null = null;
async function getFontBytes(): Promise<Buffer> {
  if (!fontBytesCache) {
    fontBytesCache = await readFile(FONT_PATH);
  }
  return fontBytesCache;
}

/**
 * Determine whether to use light or dark watermark text based on
 * the average brightness of the bottom portion of an image.
 * Returns an rgba color with low opacity.
 */
function watermarkColorFromBrightness(avgBrightness: number): {
  r: number;
  g: number;
  b: number;
  opacity: number;
} {
  // Dark background → light watermark, light background → dark watermark
  if (avgBrightness < 128) {
    return { r: 1, g: 1, b: 1, opacity: 0.08 };
  }
  return { r: 0, g: 0, b: 0, opacity: 0.06 };
}

/**
 * Sample the average brightness of the bottom ~10% of an image buffer.
 */
async function sampleBottomBrightness(
  imageBuffer: Uint8Array
): Promise<number> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 600;

    const cropHeight = Math.max(Math.floor(height * 0.1), 20);
    const top = height - cropHeight;

    const { data, info } = await sharp(imageBuffer)
      .extract({ left: 0, top, width, height: cropHeight })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = info.channels;
    let totalBrightness = 0;
    const pixelCount = data.length / channels;

    for (let i = 0; i < data.length; i += channels) {
      // Luminance approximation: 0.299R + 0.587G + 0.114B
      totalBrightness +=
        data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }

    return totalBrightness / pixelCount;
  } catch {
    return 200; // Default to light background assumption
  }
}

/**
 * Watermark a PDF: adds "libraryyy.com" at the bottom center of every page
 * with Cooper BT Light font and dynamic color/opacity.
 */
export async function watermarkPdf(
  pdfBytes: Uint8Array
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const fontBytes = await getFontBytes();
  const cooperFont = await pdfDoc.embedFont(fontBytes);

  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();

    const fontSize = Math.min(width * 0.022, 14);
    const textWidth = cooperFont.widthOfTextAtSize(WATERMARK_TEXT, fontSize);
    const x = (width - textWidth) / 2;
    const y = height * 0.02; // 2% from bottom

    // For PDFs we sample background color from the page's median box
    // Since we can't easily rasterize a single page here, use a heuristic:
    // Default to dark text on assumed-light slides. If a page has a dark
    // media box (rare), the low opacity makes it blend anyway.
    const brightness = 200; // Most slides/docs have white/light backgrounds
    const color = watermarkColorFromBrightness(brightness);

    page.drawText(WATERMARK_TEXT, {
      x,
      y,
      size: fontSize,
      font: cooperFont,
      color: rgb(color.r, color.g, color.b),
      opacity: color.opacity,
    });
  }

  const result = await pdfDoc.save();
  return new Uint8Array(result);
}

/**
 * Watermark an image (PNG, JPEG, WebP, GIF→PNG):
 * Composites "libraryyy.com" at the bottom center with dynamic color.
 */
export async function watermarkImage(
  imageBuffer: Uint8Array,
  mimeType: string
): Promise<{ buffer: Uint8Array; mimeType: string }> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Sample bottom brightness for dynamic coloring
  const brightness = await sampleBottomBrightness(imageBuffer);
  const color = watermarkColorFromBrightness(brightness);

  const fontSize = Math.min(Math.round(width * 0.022), 32);
  const bottomMargin = Math.round(height * 0.02);

  // Build SVG text overlay
  const hexColor =
    color.r === 1
      ? `rgba(255,255,255,${color.opacity})`
      : `rgba(0,0,0,${color.opacity})`;

  const svgOverlay = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <style>
        @font-face {
          font-family: 'Cooper';
          src: url('data:font/otf;base64,${(await getFontBytes()).toString("base64")}');
        }
      </style>
      <text
        x="50%"
        y="${height - bottomMargin}"
        text-anchor="middle"
        font-family="Cooper, serif"
        font-size="${fontSize}"
        fill="${hexColor}"
        letter-spacing="1"
      >${WATERMARK_TEXT}</text>
    </svg>`
  );

  // GIF → convert to PNG (sharp can't output GIF)
  let outputFormat: "png" | "jpeg" | "webp" = "png";
  let outputMime = mimeType;
  if (mimeType === "image/jpeg") {
    outputFormat = "jpeg";
  } else if (mimeType === "image/webp") {
    outputFormat = "webp";
  } else {
    outputFormat = "png";
    outputMime = "image/png";
  }

  const result = await sharp(imageBuffer)
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    [outputFormat]({ quality: 90 })
    .toBuffer();

  return { buffer: new Uint8Array(result), mimeType: outputMime };
}

/**
 * Main entry: watermark a file buffer based on its MIME type.
 * Only PDFs and images are accepted for upload — all get watermarked.
 * Fallback returns buffer unchanged as a safety net.
 */
export async function watermarkFile(
  buffer: Uint8Array,
  mimeType: string
): Promise<{ buffer: Uint8Array; mimeType: string }> {
  if (mimeType === "application/pdf") {
    const watermarked = await watermarkPdf(buffer);
    return { buffer: watermarked, mimeType };
  }

  if (mimeType.startsWith("image/")) {
    return watermarkImage(buffer, mimeType);
  }

  // PPT, DOCX, TXT, etc. — no watermark, return as-is
  return { buffer, mimeType };
}
