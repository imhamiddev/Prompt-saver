"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/auth/submit-button";
import { FieldError } from "@/components/auth/field-error";
import { CategorySelect } from "@/components/categories/category-select";
import { NewCategoryDialog } from "@/components/categories/new-category-dialog";
import { createPrompt, updatePrompt } from "@/actions/prompts";
import type { Category } from "@/lib/queries/categories";
import type { PromptActionResult } from "@/actions/prompts";

const initialState: PromptActionResult = { error: null };

const PROMPT_TEXT_MAX = 50000;
const TITLE_MAX = 200;

export function PromptForm({
  mode,
  categories,
  defaultValues,
}: {
  mode: "create" | "edit";
  categories: Category[];
  defaultValues?: {
    id: string;
    title: string;
    promptText: string;
    categoryId: string;
  };
}) {
  const router = useRouter();
  const action = mode === "create" ? createPrompt : updatePrompt;
  const [state, formAction] = useActionState(action, initialState);
  const [promptText, setPromptText] = useState(
    defaultValues?.promptText ?? "",
  );
  const [title, setTitle] = useState(defaultValues?.title ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {mode === "edit" && defaultValues && (
        <input type="hidden" name="id" value={defaultValues.id} />
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title">Title</Label>
          <span className="text-xs text-muted-foreground">
            {title.length}/{TITLE_MAX}
          </span>
        </div>
        <Input
          id="title"
          name="title"
          placeholder="e.g. Professional email rewriter"
          required
          maxLength={TITLE_MAX}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={!!state.fieldErrors?.title}
        />
        <FieldError messages={state.fieldErrors?.title} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="category">Category</Label>
          <NewCategoryDialog onCreated={() => router.refresh()} />
        </div>
        <CategorySelect
          categories={categories}
          defaultValue={defaultValues?.categoryId}
          name="categoryId"
        />
        <FieldError messages={state.fieldErrors?.categoryId} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="promptText">Prompt text</Label>
          <span className="text-xs text-muted-foreground">
            {promptText.length.toLocaleString()}/
            {PROMPT_TEXT_MAX.toLocaleString()}
          </span>
        </div>
        <Textarea
          id="promptText"
          name="promptText"
          placeholder="Write or paste your prompt here..."
          required
          maxLength={PROMPT_TEXT_MAX}
          rows={12}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          aria-invalid={!!state.fieldErrors?.promptText}
          className="font-mono text-sm"
        />
        <FieldError messages={state.fieldErrors?.promptText} />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <SubmitButton pendingText={mode === "create" ? "Creating..." : "Saving..."}>
          {mode === "create" ? "Create prompt" : "Save changes"}
        </SubmitButton>
      </div>
    </form>
  );
}
