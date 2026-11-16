/** Shown wherever a photo could not be processed. Nothing was uploaded. */
export const PHOTO_FAILED_MESSAGE =
  "Couldn't process that photo. Please retake it.";

/** Thrown when a photo can't be re-encoded; the caller must not upload. */
export class PhotoProcessError extends Error {
  constructor(reason: string) {
    super(`Photo could not be processed: ${reason}`);
    this.name = "PhotoProcessError";
  }
}

/** True when the blob starts with the JPEG signature (FF D8 FF). */
export async function isJpeg(blob: Blob): Promise<boolean> {
  const head = new Uint8Array(await blob.slice(0, 3).arrayBuffer());
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}

/**
 * Downscale to a 2048px long edge and re-encode as JPEG. Re-encoding through
 * a canvas drops EXIF (location) before the photo leaves the phone.
 *
 * Never returns the original file: it still carries its EXIF/GPS and the
 * bucket is public. If the browser can't decode or re-encode the photo (no
 * decoder, no 2d context, `toBlob` gives nothing, or the result isn't a JPEG)
 * this throws a {@link PhotoProcessError} and the caller must not upload.
 */
export async function compressPhoto(file: File): Promise<Blob> {
  let blob: Blob | null;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    try {
      const scale = Math.min(
        1,
        2048 / Math.max(bitmap.width, bitmap.height, 1)
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new PhotoProcessError("no 2d canvas context");
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85)
      );
    } finally {
      bitmap.close();
    }
  } catch (e) {
    if (e instanceof PhotoProcessError) throw e;
    throw new PhotoProcessError(e instanceof Error ? e.message : "decode");
  }
  if (!blob || blob.size === 0) throw new PhotoProcessError("no encoded data");
  if (!(await isJpeg(blob))) throw new PhotoProcessError("not a JPEG");
  return blob;
}
