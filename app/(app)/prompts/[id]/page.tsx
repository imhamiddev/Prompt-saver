import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Pencil, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/prompts/copy-button";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { FavoriteButton } from "@/components/prompts/favorite-button";
import { ImageGrid } from "@/components/prompts/image-grid";
import { ImageUploader } from "@/components/prompts/image-uploader";
import { deletePrompt } from "@/actions/prompts";
import { getPromptById } from "@/lib/queries/prompts";
import { getPromptImages } from "@/lib/queries/prompt-images";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const prompt = await getPromptById(id);
  return { title: prompt ? `${prompt.title} — Prompt Manager` : "Prompt not found" };
}

export default async function PromptDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const prompt = await getPromptById(id);

  // RLS means a prompt that exists but belongs to someone else comes back
  // as null here too - we render the same 404 either way (spec 28: never
  // reveal whether a resource exists for another user).
  if (!prompt) {
    notFound();
  }

  const images = await getPromptImages(prompt.id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/dashboard">
            <ArrowLeft /> Back to dashboard
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {prompt.title}
            </h1>
            {prompt.category && (
              <Badge variant="secondary" className="mt-2">
                {prompt.category.name}
              </Badge>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FavoriteButton
              promptId={prompt.id}
              initialIsFavorite={prompt.is_favorite}
            />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/prompts/${prompt.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <DeleteConfirmDialog
              trigger={
                <Button variant="outline" size="sm">
                  <Trash2 /> Delete
                </Button>
              }
              title="Delete this prompt?"
              description="This will permanently delete the prompt and any images attached to it. This action cannot be undone."
              action={deletePrompt}
              hiddenFields={{ id: prompt.id }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Prompt text
          </span>
          <div className="flex items-center gap-2">
            <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
              Ctrl/⌘+C
            </kbd>
            <CopyButton text={prompt.prompt_text} enableShortcut />
          </div>
        </div>
        <pre className="whitespace-pre-wrap break-words font-mono text-sm">
          {prompt.prompt_text}
        </pre>
      </div>

      <p className="text-xs text-muted-foreground">
        Last updated {new Date(prompt.updated_at).toLocaleString()}
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Images</h2>
          <ImageUploader promptId={prompt.id} currentCount={images.length} />
        </div>
        <ImageGrid images={images} />
      </div>
    </div>
  );
}
