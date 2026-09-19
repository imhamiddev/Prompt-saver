import imageCompression from "browser-image-compression";
import { MAX_IMAGE_SIZE_BYTES } from "@/lib/validations/prompt-image";

/**
 * Compresses an image client-side before upload, so a photo straight off
 * a phone camera (often 5-15MB) doesn't get rejected by the 5MB Storage
 * bucket limit (see supabase/migrations/*_storage.sql) and doesn't cost
 * the user unnecessary upload time/bandwidth.
 *
 * GIFs are passed through unmodified: they're often animated, and
 * browser-image-compression (like most canvas-based compressors) would
 * silently flatten them to a single static frame, which is almost never
 * what the person intended when they picked a GIF.
 *
 * Runs in a Web Worker (useWebWorker: true) so it doesn't block the
 * main thread / freeze the UI while compressing.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (file.type === "image/gif") {
    return file;
  }

  // Already comfortably under the limit - compressing further buys
  // nothing and just costs time for no benefit.
  const COMFORTABLY_UNDER_LIMIT = MAX_IMAGE_SIZE_BYTES * 0.8;
  if (file.size <= COMFORTABLY_UNDER_LIMIT) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: MAX_IMAGE_SIZE_BYTES / (1024 * 1024),
      // Caps resolution too - a 12MP+ phone photo has far more detail
      // than this app's image previews ever need, and this is often
      // what actually gets the file size down, more than quality alone.
      maxWidthOrHeight: 2560,
      useWebWorker: true,
      fileType: file.type,
    });

    // browser-image-compression preserves the original File's `name`
    // but can return a bare Blob in some edge cases - normalize back to
    // a File so the rest of the upload pipeline (which reads .name and
    // .type) doesn't need to special-case this.
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    // If compression fails for any reason (corrupt image, unsupported
    // edge case, etc.), fall back to the original file rather than
    // blocking the upload entirely - the server-side size/type checks
    // (see actions/prompt-images.ts) are the real backstop either way.
    console.error("Image compression failed, uploading original:", error);
    return file;
  }
}
