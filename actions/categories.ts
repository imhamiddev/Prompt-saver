"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createCategorySchema,
  renameCategorySchema,
  deleteCategorySchema,
} from "@/lib/validations/category";

export type CategoryActionResult = {
  error: string | null;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
};

function friendlyCategoryError(message: string): string {
  console.error("Category action error:", message);
  const normalized = message.toLowerCase();
  if (normalized.includes("duplicate key") || normalized.includes("unique")) {
    return "You already have a category with this name.";
  }
  return "Something went wrong. Please try again.";
}

export async function createCategory(
  _prevState: CategoryActionResult,
  formData: FormData,
): Promise<CategoryActionResult> {
  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
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

  const { error } = await supabase.from("categories").insert({
    user_id: userData.user.id,
    name: parsed.data.name,
  });

  if (error) {
    return { error: friendlyCategoryError(error.message) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/categories");
  return { error: null, success: true };
}

export async function renameCategory(
  _prevState: CategoryActionResult,
  formData: FormData,
): Promise<CategoryActionResult> {
  const parsed = renameCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
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

  // RLS also enforces ownership; the explicit .eq("user_id", ...) below is
  // defense in depth so a mismatched row simply matches zero rows instead
  // of relying solely on the database-level policy.
  const { data, error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id)
    .select("id");

  if (error) {
    return { error: friendlyCategoryError(error.message) };
  }
  if (!data || data.length === 0) {
    return { error: "Category not found." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/categories");
  return { error: null, success: true };
}

export async function deleteCategory(
  _prevState: CategoryActionResult,
  formData: FormData,
): Promise<CategoryActionResult> {
  const parsed = deleteCategorySchema.safeParse({ id: formData.get("id") });

  if (!parsed.success) {
    return { error: "Invalid category." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", userData.user.id);

  if (error) {
    // The FK is ON DELETE RESTRICT, so Postgres raises a foreign_key_violation
    // if this category still has prompts attached to it.
    if (error.code === "23503") {
      return {
        error:
          "This category still has prompts in it. Move or delete those prompts first.",
      };
    }
    return { error: friendlyCategoryError(error.message) };
  }

  revalidatePath("/dashboard");
  revalidatePath("/categories");
  return { error: null, success: true };
}
