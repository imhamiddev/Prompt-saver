"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_IMAGES_PER_PROMPT,
  deletePromptImageSchema,
  reorderPromptImagesSchema,
  uploadPromptImageSchema,
  validateImageFile,
  extensionForMimeType,
} from "@/lib/validations/prompt-image";

export type ImageActionResult = {
  error: string | null;
};

const BUCKET = "prompt-images";

/**
 * Uploads one image for a prompt (spec sections 6, 9, 16, 30):
 *  - verifies the prompt belongs to the current user
 *  - enforces the 5-image-per-prompt cap (also enforced in the database
 *    trigger - this check just gives a friendlier error before we ever
 *    touch Storage)
 *  - stores the file at prompt-images/{user_id}/{prompt_id}/{uuid}.{ext}
 *  - inserts the prompt_images row; rolls back the uploaded Storage object
 *    if that insert fails, so we never leak an orphaned file
 */
export async function uploadPromptImage(
  _prevState: ImageActionResult,
  formData: FormData,
): Promise<ImageActionResult> {
  const parsed = uploadPromptImageSchema.safeParse({
    promptId: formData.get("promptId"),
  });
  if (!parsed.success) {
    return { error: "Invalid prompt." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "No file was selected." };
  }

  const fileError = validateImageFile(file);
  if (fileError) {
    return { error: fileError };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be logged in." };
  }

  // Ownership check: RLS would also block a cross-user insert, but we
  // check explicitly first so we can give a clear error and avoid an
  // unnecessary Storage upload for a prompt that isn't even the user's.
  const { data: prompt, error: promptError } = await supabase
    .from("prompts")
    .select("id, user_id")
    .eq("id", parsed.data.promptId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (promptError || !prompt) {
    return { error: "Prompt not found." };
  }

  const { count: existingCount, error: countError } = await supabase
    .from("prompt_images")
    .select("id", { count: "exact", head: true })
    .eq("prompt_id", parsed.data.promptId);

  if (countError) {
    console.error("Failed to count prompt images:", countError);
    return { error: "Something went wrong. Please try again." };
  }
  if ((existingCount ?? 0) >= MAX_IMAGES_PER_PROMPT) {
    return { error: `A prompt can have at most ${MAX_IMAGES_PER_PROMPT} images.` };
  }

  const nextDisplayOrder = existingCount ?? 0;
  const extension = extensionForMimeType(file.type);
  const storagePath = `${userData.user.id}/${parsed.data.promptId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload image to storage:", uploadError);
    return { error: "Failed to upload image. Please try again." };
  }

  const { error: insertError } = await supabase.from("prompt_images").insert({
    prompt_id: parsed.data.promptId,
    user_id: userData.user.id,
    storage_path: storagePath,
    display_order: nextDisplayOrder,
  });

  if (insertError) {
    // Roll back the orphaned Storage object - the metadata row is the
    // source of truth, so a file with no row must not be left behind.
    await supabase.storage.from(BUCKET).remove([storagePath]);

    if (insertError.message.toLowerCase().includes("at most 5 images")) {
      return { error: `A prompt can have at most ${MAX_IMAGES_PER_PROMPT} images.` };
    }
    console.error("Failed to insert prompt_images row:", insertError);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath(`/prompts/${parsed.data.promptId}`);
  revalidatePath(`/prompts/${parsed.data.promptId}/edit`);
  return { error: null };
}

/**
 * Deletes one image: removes the Storage object first, then the metadata
 * row (see deletePrompt in actions/prompts.ts for the cascade-delete case
 * when a whole prompt is removed).
 */
export async function deletePromptImage(
  _prevState: ImageActionResult,
  formData: FormData,
): Promise<ImageActionResult> {
  const parsed = deletePromptImageSchema.safeParse({
    id: formData.get("id"),
  });
  if (!parsed.success) {
    return { error: "Invalid image." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be logged in." };
  }

  const { data: image, error: fetchError } = await supabase
    .from("prompt_images")
    .select("id, prompt_id, storage_path")
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (fetchError || !image) {
    return { error: "Image not found." };
  }

  const { error: deleteRowError } = await supabase
    .from("prompt_images")
    .delete()
    .eq("id", image.id)
    .eq("user_id", userData.user.id);

  if (deleteRowError) {
    console.error("Failed to delete prompt_images row:", deleteRowError);
    return { error: "Something went wrong. Please try again." };
  }

  // Best-effort: the metadata row is already gone (the source of truth
  // for "does this image exist"), so a failure here just leaves an
  // orphaned file rather than a broken reference. Not surfaced as an
  // error to the user since the delete they asked for did succeed.
  const { error: removeError } = await supabase.storage
    .from(BUCKET)
    .remove([image.storage_path]);
  if (removeError) {
    console.error("Failed to remove storage object:", removeError);
  }

  revalidatePath(`/prompts/${image.prompt_id}`);
  revalidatePath(`/prompts/${image.prompt_id}/edit`);
  return { error: null };
}

/**
 * Persists a new display order for a prompt's images (drag-to-reorder).
 */
export async function reorderPromptImages(
  input: unknown,
): Promise<ImageActionResult> {
  const parsed = reorderPromptImagesSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid reorder request." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be logged in." };
  }

  // Two-phase update to avoid colliding with the (prompt_id, display_order)
  // unique index while reordering: first move everything to negative,
  // temporary slots, then assign the final order. Each update is scoped
  // to user_id as well as prompt_id for defense in depth.
  const { orderedImageIds, promptId } = parsed.data;

  for (let i = 0; i < orderedImageIds.length; i++) {
    const { error } = await supabase
      .from("prompt_images")
      .update({ display_order: -(i + 1) })
      .eq("id", orderedImageIds[i])
      .eq("prompt_id", promptId)
      .eq("user_id", userData.user.id);
    if (error) {
      console.error("Failed to reorder (phase 1):", error);
      return { error: "Something went wrong. Please try again." };
    }
  }

  for (let i = 0; i < orderedImageIds.length; i++) {
    const { error } = await supabase
      .from("prompt_images")
      .update({ display_order: i })
      .eq("id", orderedImageIds[i])
      .eq("prompt_id", promptId)
      .eq("user_id", userData.user.id);
    if (error) {
      console.error("Failed to reorder (phase 2):", error);
      return { error: "Something went wrong. Please try again." };
    }
  }

  revalidatePath(`/prompts/${promptId}`);
  revalidatePath(`/prompts/${promptId}/edit`);
  return { error: null };
}
