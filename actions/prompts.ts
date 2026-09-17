"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createPromptSchema,
  updatePromptSchema,
  deletePromptSchema,
} from "@/lib/validations/prompt";

export type PromptActionResult = {
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

function friendlyPromptError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("category_id must reference")) {
    return "Choose a valid category.";
  }
  return "Something went wrong. Please try again.";
}

export async function createPrompt(
  _prevState: PromptActionResult,
  formData: FormData,
): Promise<PromptActionResult> {
  const parsed = createPromptSchema.safeParse({
    title: formData.get("title"),
    promptText: formData.get("promptText"),
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be logged in." };
  }

  const { data, error } = await supabase
    .from("prompts")
    .insert({
      user_id: userData.user.id,
      category_id: parsed.data.categoryId,
      title: parsed.data.title,
      prompt_text: parsed.data.promptText,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: friendlyPromptError(error?.message ?? "") };
  }

  revalidatePath("/dashboard");
  redirect(`/prompts/${data.id}`);
}

export async function updatePrompt(
  _prevState: PromptActionResult,
  formData: FormData,
): Promise<PromptActionResult> {
  const parsed = updatePromptSchema.safeParse({
    id: formData.get("id"),
    title: formData.get("title"),
    promptText: formData.get("promptText"),
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be logged in." };
  }

  const { data, error } = await supabase
    .from("prompts")
    .update({
      title: parsed.data.title,
      prompt_text: parsed.data.promptText,
      category_id: parsed.data.categoryId,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: friendlyPromptError(error.message) };
  }
  if (!data) {
    return { error: "Prompt not found." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/prompts/${parsed.data.id}`);
  redirect(`/prompts/${parsed.data.id}`);
}

export async function deletePrompt(
  _prevState: PromptActionResult,
  formData: FormData,
): Promise<PromptActionResult> {
  const parsed = deletePromptSchema.safeParse({ id: formData.get("id") });

  if (!parsed.success) {
    return { error: "Invalid prompt." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be logged in." };
  }

  // Look up the image storage paths before deleting the prompt. The
  // prompt_images rows themselves are cleaned up automatically by
  // ON DELETE CASCADE (see migration), but Postgres cascades can't reach
  // into Storage - the actual files need an explicit removal call.
  const { data: images } = await supabase
    .from("prompt_images")
    .select("storage_path")
    .eq("prompt_id", parsed.data.id)
    .eq("user_id", userData.user.id);

  const { error } = await supabase
    .from("prompts")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id);

  if (error) {
    return { error: friendlyPromptError(error.message) };
  }

  if (images && images.length > 0) {
    // Best-effort: the prompt (and its metadata rows, via cascade) are
    // already gone at this point, so a failure here only leaves orphaned
    // Storage objects rather than a broken user-facing reference.
    await supabase.storage
      .from("prompt-images")
      .remove(images.map((image) => image.storage_path));
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
