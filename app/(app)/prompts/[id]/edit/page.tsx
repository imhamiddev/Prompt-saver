import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PromptForm } from "@/components/prompts/prompt-form";
import { getPromptById } from "@/lib/queries/prompts";
import { getCategories } from "@/lib/queries/categories";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const prompt = await getPromptById(id);
  return {
    title: prompt ? `Edit ${prompt.title} — Prompt Manager` : "Prompt not found",
  };
}

export default async function EditPromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [prompt, categories] = await Promise.all([
    getPromptById(id),
    getCategories(),
  ]);

  if (!prompt) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit prompt</h1>
      </div>
      <PromptForm
        mode="edit"
        categories={categories}
        defaultValues={{
          id: prompt.id,
          title: prompt.title,
          promptText: prompt.prompt_text,
          categoryId: prompt.category_id,
        }}
      />
    </div>
  );
}
