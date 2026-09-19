import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Prompt Manager — Your private library of AI prompts",
  description:
    "Save, organize, and reuse the AI prompts you rely on. Search, categorize, and copy them in seconds.",
};

export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">
          Prompt Manager
        </span>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Sign up</Link>
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          A private place for your AI prompts
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Save the prompts you find or write, organize them into categories,
          and find exactly the one you need in seconds.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <Button size="lg" asChild>
            <Link href="/register">Get started for free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Prompt Manager
      </footer>
    </div>
  );
}
