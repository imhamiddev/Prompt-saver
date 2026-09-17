import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { PAGE_SIZE, type PromptListParams } from "@/lib/validations/prompt";

export type Prompt = Database["public"]["Tables"]["prompts"]["Row"];
export type PromptWithCategory = Prompt & {
  category: { id: string; name: string } | null;
};

export type PromptListResult = {
  prompts: PromptWithCategory[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

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

  return {
    prompts: data as unknown as PromptWithCategory[],
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
): Promise<PromptWithCategory | null> {
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

  return data as unknown as PromptWithCategory | null;
}
