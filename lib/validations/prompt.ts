import { z } from "zod";

// Mirrors the CHECK constraints in supabase/migrations/*_prompts.sql -
// keep these two in sync if either changes.
export const promptTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required.")
  .max(200, "Title must be at most 200 characters.");

export const promptTextSchema = z
  .string()
  .trim()
  .min(1, "Prompt text is required.")
  .max(50000, "Prompt text must be at most 50,000 characters.");

export const categoryIdSchema = z.string().uuid("Choose a category.");

export const createPromptSchema = z.object({
  title: promptTitleSchema,
  promptText: promptTextSchema,
  categoryId: categoryIdSchema,
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;

export const updatePromptSchema = z.object({
  id: z.string().uuid("Invalid prompt id."),
  title: promptTitleSchema,
  promptText: promptTextSchema,
  categoryId: categoryIdSchema,
});

export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;

export const deletePromptSchema = z.object({
  id: z.string().uuid("Invalid prompt id."),
});

// Search/filter/pagination params for the dashboard list (spec 11/20/21).
export const promptListParamsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  categoryId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type PromptListParams = z.infer<typeof promptListParamsSchema>;

export const PAGE_SIZE = 12;
