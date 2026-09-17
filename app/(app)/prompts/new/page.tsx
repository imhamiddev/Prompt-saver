import type { Metadata } from "next";
import { PromptForm } from "@/components/prompts/prompt-form";
import { getCategories } from "@/lib/queries/categories";

export const metadata: Metadata = {
  title: "New prompt — Prompt Manager",
};

export default async function NewPromptPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New prompt</h1>
        <p className="text-sm text-muted-foreground">
          Save a prompt to your library.
        </p>
      </div>
      <PromptForm mode="create" categories={categories} />
    </div>
  );
}
