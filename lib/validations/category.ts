import { z } from "zod";

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, "Category name is required.")
  .max(100, "Category name must be at most 100 characters.");

export const createCategorySchema = z.object({
  name: categoryNameSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const renameCategorySchema = z.object({
  id: z.string().uuid("Invalid category id."),
  name: categoryNameSchema,
});

export type RenameCategoryInput = z.infer<typeof renameCategorySchema>;

export const deleteCategorySchema = z.object({
  id: z.string().uuid("Invalid category id."),
});
