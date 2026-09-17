import { z } from "zod";

// Mirrors supabase/migrations/*_storage.sql bucket config (file_size_limit,
// allowed_mime_types) and *_prompt_images.sql (max 5 images per prompt,
// display_order 0-4). Keep these in sync if either side changes.
export const MAX_IMAGES_PER_PROMPT = 5;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const uploadPromptImageSchema = z.object({
  promptId: z.string().uuid("Invalid prompt id."),
});

export const deletePromptImageSchema = z.object({
  id: z.string().uuid("Invalid image id."),
});

export const reorderPromptImagesSchema = z.object({
  promptId: z.string().uuid("Invalid prompt id."),
  // Ordered array of image ids, front-to-back.
  orderedImageIds: z.array(z.string().uuid()).max(MAX_IMAGES_PER_PROMPT),
});

/**
 * Validates a File's declared type/size before we ever touch Storage.
 * This is a first line of defense for a fast, friendly error - the bucket's
 * own file_size_limit/allowed_mime_types config is the real enforcement
 * point Storage checks server-side regardless of what the client claims.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as never)) {
    return "Only JPEG, PNG, WebP, or GIF images are allowed.";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Images must be 5 MB or smaller.";
  }
  if (file.size === 0) {
    return "The selected file is empty.";
  }
  return null;
}

export function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}
