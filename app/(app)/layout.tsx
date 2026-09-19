import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/actions/auth";
import { SubmitButton } from "@/components/auth/submit-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  // Defense in depth: middleware already protects this route group, but a
  // Server Component should never assume that and skip its own check
  // (spec section 18/28 - never rely on a single layer of enforcement).
  if (error || !data.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-lg font-semibold tracking-tight">
          Prompt Manager
        </span>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {data.user.email}
          </span>
          <ThemeToggle />
          <form action={logout}>
            <SubmitButton variant="outline" size="sm" pendingText="Logging out...">
              Log out
            </SubmitButton>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
