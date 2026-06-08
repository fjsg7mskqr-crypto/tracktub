// Client-side image compression for the demo's real photo capture.
// No backend: captured photos are downscaled + JPEG-encoded to a data URL so a
// handful of turnovers fit inside localStorage (~5 MB). See
// docs/superpowers/specs/2026-06-07-real-photo-capture-design.md.

/** Thrown when a selected file can't be decoded as an image (e.g. HEIC on a
 *  browser without HEIC support). Callers surface a friendly retry message. */
export class ImageDecodeError extends Error {
  constructor() {
    super("Could not decode the selected file as an image.");
    this.name = "ImageDecodeError";
  }
}

export interface CompressOptions {
  /** Longest edge of the output, in px. Aspect ratio is preserved. */
  maxEdge?: number;
  /** JPEG quality, 0–1. */
  quality?: number;
}

/**
 * Decode `file`, downscale so its long edge is at most `maxEdge`, and return a
 * `image/jpeg` data URL. EXIF orientation is normalized (`from-image`) so phone
 * photos aren't sideways. Throws `ImageDecodeError` if the file can't be decoded.
 */
export async function fileToCompressedDataUrl(
  file: File,
  opts: CompressOptions = {}
): Promise<string> {
  const maxEdge = opts.maxEdge ?? 1280;
  const quality = opts.quality ?? 0.72;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageDecodeError();
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height) || 1;
    const scale = Math.min(1, maxEdge / longest);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageDecodeError();

    ctx.drawImage(bitmap, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}
