import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyEmailNotice } from "./verify-email-notice";

export const metadata: Metadata = {
  title: "Verify your email — Prompt Manager",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  // This page only makes sense with an email to show - if someone lands
  // here directly with no query param, send them back to start signup.
  if (!email) {
    redirect("/register");
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <VerifyEmailNotice email={email} />
    </main>
  );
}
