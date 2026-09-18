"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function subscribe() {
  // The fragment never changes after initial load for this page, so
  // there's nothing to subscribe to - this store is read-once.
  return () => {};
}

function getConfirmUrlFromFragment(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  return new URLSearchParams(hash).get("confirm_url");
}

/**
 * Landing page for the password-reset email link (see
 * supabase/email-templates/reset-password.html). The real Supabase
 * confirm URL is carried in the URL *fragment* (after #), not the query
 * string, specifically so that email-client / security-scanner link
 * prefetching - which reads the URL a server would see, but never the
 * fragment - cannot consume the single-use token before the person
 * actually clicks anything here.
 *
 * This page deliberately requires an explicit button click to proceed;
 * auto-redirecting on page load would defeat the whole point, since some
 * prefetchers execute JavaScript too.
 *
 * Uses useSyncExternalStore (not useState+useEffect) to read the
 * fragment: window.location is an external, non-React data source, and
 * this is React's dedicated tool for that - it correctly returns null
 * during server rendering (getServerSnapshot) rather than needing an
 * effect + extra "have we read it yet" state to avoid a hydration
 * mismatch.
 */
export default function ResetPasswordStartPage() {
  const confirmUrl = useSyncExternalStore(
    subscribe,
    getConfirmUrlFromFragment,
    () => null, // server snapshot: fragment is never available server-side
  );

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>
            For your security, click below to continue. This confirms the
            request came from you rather than an automated scanner.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          {confirmUrl ? (
            <Button asChild className="w-full">
              <a href={confirmUrl}>Continue to reset password</a>
            </Button>
          ) : (
            <>
              <p className="text-center text-sm text-destructive">
                This link is missing or malformed.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
