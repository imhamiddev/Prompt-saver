import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Supabase client for use on the server: Server Components, Server Actions,
 * and Route Handlers. Reads/writes the user's session via cookies.
 *
 * NOTE: this must be created fresh per request (it closes over the current
 * request's cookies), so always call this function rather than caching its
 * result across requests.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` is called from a Server Component in some cases
            // (e.g. during a page render triggered by middleware refresh).
            // Server Components cannot set cookies, and that's fine as
            // long as middleware is also refreshing the session, which it
            // is (see middleware.ts). Safe to ignore here.
          }
        },
      },
    },
  );
}
