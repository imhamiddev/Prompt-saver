import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Category = Database["public"]["Tables"]["categories"]["Row"];

/**
 * All categories belonging to the current user, alphabetically.
 * RLS already scopes this to the current user - the .eq below is a
 * belt-and-suspenders explicit filter, not the sole enforcement.
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load categories: ${error.message}`);
  }

  return data;
}

/**
 * Count of prompts in each category, for showing counts / preventing
 * deletion of non-empty categories in the UI before the user even tries.
 */
export async function getCategoryPromptCounts(): Promise<
  Record<string, number>
> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return {};

  const { data, error } = await supabase
    .from("prompts")
    .select("category_id")
    .eq("user_id", userData.user.id);

  if (error) {
    throw new Error(`Failed to load category counts: ${error.message}`);
  }

  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
  }
  return counts;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load category: ${error.message}`);
  }

  return data;
}
