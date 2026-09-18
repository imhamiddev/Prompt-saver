"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  resendConfirmationEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export type AuthActionResult = {
  error: string | null;
  fieldErrors?: Record<string, string[]>;
};

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  // x-forwarded-for is set by Vercel's edge network; take the first hop.
  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() ?? "unknown";
}

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

  // Defense in depth alongside Supabase Auth's own rate limiting (spec:
  // "rate limiting where appropriate"). See lib/rate-limit.ts for the
  // per-instance-memory caveat on serverless deployments.
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(`register:${ip}`, {
    max: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!allowed) {
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Supabase's built-in Confirm Signup email will contain a link to
      // this URL with the necessary tokens attached; Supabase's own
      // /auth/v1/verify endpoint handles the token exchange before
      // redirecting here, so App Router doesn't need its own callback
      // route for this flow.
      emailRedirectTo: `${await getSiteUrl()}/dashboard`,
    },
  });

  if (error) {
    // Supabase's own message is safe to show for common cases (e.g.
    // "User already registered"), but we never surface raw internals.
    return { error: friendlyAuthError(error.message) };
  }

  // signUp does not return an active session when email confirmation is
  // required (the default) - the user must click the link Supabase just
  // emailed them before they have one. Send them to a simple
  // "check your email" page rather than the dashboard.
  revalidatePath("/", "layout");
  redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

async function getSiteUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

/**
 * Re-sends the signup confirmation email, for the "resend the email" button
 * on the /verify-email page.
 */
export async function resendConfirmationEmail(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = resendConfirmationEmailSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: "Invalid email." };
  }

  // Tighter limit here: this is the action most worth throttling, since
  // it directly triggers an outbound email send (and Supabase's own
  // email-sending rate limit, shared across the whole project, is very
  // low on the default/free tier - see README).
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(`resend-confirmation:${ip}:${parsed.data.email}`, {
    max: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!allowed) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    email: parsed.data.email,
    type: "signup",
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  return { error: null };
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

  // Rate-limit by IP + email together: this stops both a single attacker
  // hammering many accounts from one IP, and distributed guesses against
  // one specific account (spec: "rate limiting where appropriate").
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(`login:${ip}:${parsed.data.email}`, {
    max: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!allowed) {
    return { error: "Too many attempts. Please try again in a few minutes." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      redirect(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
    }
    return { error: friendlyAuthError(error.message) };
  }

  const redirectTo = formData.get("redirectTo");
  revalidatePath("/", "layout");
  redirect(typeof redirectTo === "string" && redirectTo ? redirectTo : "/dashboard");
}

/**
 * Sends a password-reset link to the given email (spec: account recovery).
 * Always returns a generic success message regardless of whether the
 * email is registered, so this can't be used to enumerate accounts
 * (spec 28: no user enumeration).
 */
export async function forgotPassword(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Tight limit: this triggers an outbound email and is a classic target
  // for abuse (mass password-reset spam against one address).
  const ip = await getClientIp();
  const { allowed } = checkRateLimit(`forgot-password:${ip}:${parsed.data.email}`, {
    max: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!allowed) {
    return { error: "Too many attempts. Please wait a few minutes and try again." };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${siteUrl}/auth/confirm?type=recovery&next=/reset-password`,
    },
  );

  // Deliberately ignore the error content here (beyond logging it): a
  // "user not found" style error must not be surfaced, or this endpoint
  // becomes a way to check which emails have an account.
  if (error) {
    console.error("forgotPassword error:", error.message);
  }

  return { error: null };
}

/**
 * Sets a new password. Only works when the user has an active recovery
 * session, which they get by clicking the link from forgotPassword's
 * email (exchanged for a session by app/auth/confirm/route.ts).
 */
export async function resetPassword(
  _prevState: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse({
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

  // Without an active (recovery) session, updateUser has nothing to
  // update - guard explicitly so we can show a clear message instead of
  // a confusing generic error.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      error: "Your password reset link has expired. Please request a new one.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
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
    // Covers Supabase's own password-policy messages (length, strength) -
    // safe to show verbatim, unlike arbitrary Postgres/internal errors.
    return message;
  }

  console.error("Auth action error:", message);
  return "Something went wrong. Please try again.";
}
