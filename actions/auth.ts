"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema } from "@/lib/validations/auth";

export type AuthActionResult = {
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Registers a new user via Supabase Auth (email + password, spec section 5).
 * Never touches the database directly - Supabase Auth owns auth.users.
 */
export async function register(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Supabase's own message is safe to show for common cases (e.g.
    // "User already registered"), but we never surface raw internals.
    return { error: friendlyAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Logs an existing user in via Supabase Auth (spec section 5).
 */
export async function login(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  const redirectTo = formData.get("redirectTo");
  revalidatePath("/", "layout");
  redirect(typeof redirectTo === "string" && redirectTo ? redirectTo : "/dashboard");
}

/**
 * Logs the current user out and returns them to the landing page.
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Maps Supabase Auth error messages to user-friendly text.
 * Never expose raw Supabase/Postgres internals to the client (spec 27/28).
 */
function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("already registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email address before logging in.";
  }
  if (normalized.includes("password")) {
    // Covers Supabase's own password-policy messages (length, strength).
    return message;
  }

  return "Something went wrong. Please try again.";
}
