import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the link Supabase emails for signup confirmation and password
 * recovery. Both email templates must point here with a token_hash and
 * type, e.g.:
 *
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
 *
 * This route exchanges that token for a session (setting the auth
 * cookies via our server client), then redirects to `next` - which for
 * password recovery must be /reset-password, so the user can set a new
 * password while Supabase treats their session as a recovery session.
 *
 * See README's "Email templates" section for the exact template markup
 * this route expects.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      redirect(next);
    }
  }

  // Missing or invalid/expired token: send the user somewhere useful
  // with an explanation, rather than a bare error page.
  redirect("/login?error=link-expired");
}
