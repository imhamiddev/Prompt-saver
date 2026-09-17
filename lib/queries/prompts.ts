import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { PAGE_SIZE, type PromptListParams } from "@/lib/validations/prompt";

export type Prompt = Database["public"]["Tables"]["prompts"]["Row"];
export type PromptWithCategory = Prompt & {
  category: { id: string; name: string } | null;
  coverImageUrl: string | null;
};

export type PromptListResult = {
  prompts: PromptWithCategory[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const COVER_SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/**
 * Paginated, searchable, filterable list of the current user's prompts
 * (spec sections 11, 20, 21). All filtering happens in the database, not
 * in JavaScript, so this scales with the number of prompts rather than
 * loading everything into memory first.
 */
export async function getPrompts(
  params: PromptListParams,
): Promise<PromptListResult> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { prompts: [], totalCount: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 0 };
  }

  const page = params.page ?? 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("prompts")
    .select("*, category:categories(id, name)", { count: "exact" })
    .eq("user_id", userData.user.id);

  if (params.categoryId) {
    query = query.eq("category_id", params.categoryId);
  }

  if (params.q && params.q.length > 0) {
    // Full-text search against the generated search_vector column
    // (title weighted higher than prompt_text - see migration).
    // websearch_to_tsquery tolerates free-form user input safely.
    query = query.textSearch("search_vector", params.q, {
      type: "websearch",
      config: "english",
    });
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to load prompts:", error);
    throw new Error("Something went wrong loading your data. Please try again.");
  }

  const totalCount = count ?? 0;

  const rows = data as unknown as Array<
    Prompt & { category: { id: string; name: string } | null }
  >;

  // Fetch each prompt's first image (display_order 0) in one extra query
  // for this page, rather than an N+1 per card. Kept as a separate query
  // (instead of a filtered embed in the select above) because filtering
  // an embedded to-many resource by column only filters *which embedded
  // rows are included* - it does not guarantee exactly one row per
  // parent, so doing it explicitly here is clearer and less fragile than
  // relying on that PostgREST behavior.
  const promptIds = rows.map((row) => row.id);
  const coverPathByPromptId = new Map<string, string>();

  if (promptIds.length > 0) {
    const { data: coverImages, error: coverError } = await supabase
      .from("prompt_images")
      .select("prompt_id, storage_path")
      .in("prompt_id", promptIds)
      .eq("display_order", 0);

    if (coverError) {
      console.error("Failed to load cover images:", coverError);
      // Non-fatal: prompts still render, just without cover thumbnails.
    } else {
      for (const image of coverImages) {
        coverPathByPromptId.set(image.prompt_id, image.storage_path);
      }
    }
  }

  const coverPaths = Array.from(coverPathByPromptId.values());
  let signedUrlByPath = new Map<string, string>();
  if (coverPaths.length > 0) {
    const { data: signedUrls, error: signError } = await supabase.storage
      .from("prompt-images")
      .createSignedUrls(coverPaths, COVER_SIGNED_URL_EXPIRY_SECONDS);

    if (signError) {
      console.error("Failed to sign cover image URLs:", signError);
      // Non-fatal: prompts still render, just without cover thumbnails.
    } else {
      signedUrlByPath = new Map(
        signedUrls
          .filter((s) => s.signedUrl)
          .map((s) => [s.path ?? "", s.signedUrl as string]),
      );
    }
  }

  const prompts: PromptWithCategory[] = rows.map((row) => {
    const coverPath = coverPathByPromptId.get(row.id);
    return {
      ...row,
      coverImageUrl: coverPath ? signedUrlByPath.get(coverPath) ?? null : null,
    };
  });

  return {
    prompts,
    totalCount,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
  };
}

/**
 * A single prompt by id, scoped to the current user via RLS. Returns null
 * if it doesn't exist or doesn't belong to the current user - callers
 * should render a 404, never a "forbidden" (spec 28: don't leak existence
 * of other users' data).
 */
export async function getPromptById(
  id: string,
): Promise<(Prompt & { category: { id: string; name: string } | null }) | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prompts")
    .select("*, category:categories(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load prompt:", error);
    throw new Error("Something went wrong loading your data. Please try again.");
  }

  return data as unknown as
    | (Prompt & { category: { id: string; name: string } | null })
    | null;
}
