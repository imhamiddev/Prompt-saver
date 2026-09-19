import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

const PROTECTED_PREFIXES = ["/dashboard", "/prompts", "/account"];
const AUTH_PAGE_PATHS = ["/login", "/register", "/verify-email", "/forgot-password"];
// /reset-password is intentionally NOT in either list above: it needs a
// session to be useful (set by clicking the recovery email link, via
// app/auth/confirm/route.ts), but must not bounce an already-authenticated
// user back to /dashboard the way AUTH_PAGE_PATHS does - that would break
// the recovery flow, since verifyOtp({ type: "recovery" }) creates a real,
// indistinguishable-at-this-level session. It gets its own check below.

/**
 * Refreshes the Supabase auth session on every request and enforces route
 * protection at the edge (spec section 5):
 *  - unauthenticated users are redirected away from protected pages
 *  - authenticated users are redirected away from the login/register pages
 *
 * IMPORTANT: this must run on every request that touches auth state.
 * Do not remove the `supabaseResponse` cookie plumbing below — see the
 * `@supabase/ssr` docs on why both request and response cookies must be
 * kept in sync (otherwise sessions silently fail to refresh).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run any code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to
  // debug issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAuthPagePath = AUTH_PAGE_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  if (!user && isProtectedPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    // Clear the original query string first (e.g. ?favoritesOnly=true on
    // the protected page being redirected away from) before setting
    // redirectTo - otherwise it leaks into the /login URL alongside it.
    redirectUrl.search = "";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // /reset-password (exact path only - NOT /reset-password/start, see
  // below) requires *some* session, set by clicking through the
  // recovery email link. A user with no session at all landing directly
  // on /reset-password (an expired/reused link, or direct navigation)
  // is sent to request a fresh link instead.
  //
  // /reset-password/start is deliberately excluded from this check: it
  // is the public handoff page a person lands on straight from the
  // email, *before* they have any session (see
  // supabase/email-templates/reset-password.html and
  // app/(public)/reset-password/start/page.tsx for why this page exists
  // - it defeats email-scanner link prefetching that would otherwise
  // silently consume the single-use token). Redirecting it away here
  // would break the flow for every legitimate user, not just scanners.
  if (!user && pathname === "/reset-password") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/forgot-password";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPagePath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // IMPORTANT: you must return the supabaseResponse object as it is.
  // If you're creating a new response object, make sure to copy over the
  // cookies, or the browser and server will get out of sync and the user's
  // session will be terminated early.
  return supabaseResponse;
}
