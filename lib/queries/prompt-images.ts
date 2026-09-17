import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type PromptImage = Database["public"]["Tables"]["prompt_images"]["Row"];
export type PromptImageWithUrl = PromptImage & { signedUrl: string | null };

const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/**
 * Images for a given prompt, in display order, each with a short-lived
 * signed URL (spec section 9/30: never expose a public URL for private
 * Storage objects - always generate a signed URL server-side, scoped to
 * the current request).
 */
export async function getPromptImages(
  promptId: string,
): Promise<PromptImageWithUrl[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompt_images")
    .select("*")
    .eq("prompt_id", promptId)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Failed to load prompt images:", error);
    throw new Error("Something went wrong loading your data. Please try again.");
  }

  if (data.length === 0) return [];

  const { data: signedUrls, error: signError } = await supabase.storage
    .from("prompt-images")
    .createSignedUrls(
      data.map((image) => image.storage_path),
      SIGNED_URL_EXPIRY_SECONDS,
    );

  if (signError) {
    // Don't fail the whole page just because signing failed (e.g. a
    // transient Storage issue) - render the images without a URL and let
    // the UI show a broken-image fallback rather than a 500.
    return data.map((image) => ({ ...image, signedUrl: null }));
  }

  return data.map((image, i) => ({
    ...image,
    signedUrl: signedUrls[i]?.signedUrl ?? null,
  }));
}

export async function getPromptImageCount(promptId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("prompt_images")
    .select("id", { count: "exact", head: true })
    .eq("prompt_id", promptId);

  if (error) {
    console.error("Failed to count prompt images:", error);
    throw new Error("Something went wrong loading your data. Please try again.");
  }

  return count ?? 0;
}
