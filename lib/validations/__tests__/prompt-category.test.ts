import { describe, expect, it } from "vitest";
import {
  createPromptSchema,
  updatePromptSchema,
  promptListParamsSchema,
  toggleFavoriteSchema,
  PAGE_SIZE,
} from "../prompt";
import { createCategorySchema } from "../category";

describe("createPromptSchema", () => {
  it("accepts a valid prompt", () => {
    const result = createPromptSchema.safeParse({
      title: "My prompt",
      promptText: "Do something useful",
      categoryId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a blank title", () => {
    const result = createPromptSchema.safeParse({
      title: "   ",
      promptText: "Do something useful",
      categoryId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a title over 200 characters", () => {
    const result = createPromptSchema.safeParse({
      title: "a".repeat(201),
      promptText: "Do something useful",
      categoryId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(false);
  });

  it("rejects prompt text over 50,000 characters", () => {
    const result = createPromptSchema.safeParse({
      title: "My prompt",
      promptText: "a".repeat(50001),
      categoryId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid categoryId", () => {
    const result = createPromptSchema.safeParse({
      title: "My prompt",
      promptText: "Do something useful",
      categoryId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from title and promptText", () => {
    const result = createPromptSchema.safeParse({
      title: "  My prompt  ",
      promptText: "  Do something  ",
      categoryId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("My prompt");
      expect(result.data.promptText).toBe("Do something");
    }
  });
});

describe("updatePromptSchema", () => {
  it("requires a valid id in addition to the prompt fields", () => {
    const result = updatePromptSchema.safeParse({
      id: "not-a-uuid",
      title: "My prompt",
      promptText: "Do something",
      categoryId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(false);
  });
});

describe("promptListParamsSchema", () => {
  it("defaults to page 1 when no page is given", () => {
    const result = promptListParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it("coerces a string page number", () => {
    const result = promptListParamsSchema.safeParse({ page: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it("rejects page 0 or negative", () => {
    expect(promptListParamsSchema.safeParse({ page: "0" }).success).toBe(
      false,
    );
    expect(promptListParamsSchema.safeParse({ page: "-1" }).success).toBe(
      false,
    );
  });

  it("accepts an optional search query and categoryId", () => {
    const result = promptListParamsSchema.safeParse({
      q: "email writer",
      categoryId: "11111111-1111-4111-8111-111111111111",
      page: "2",
    });
    expect(result.success).toBe(true);
  });

  it("defaults favoritesOnly to false when absent", () => {
    const result = promptListParamsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.favoritesOnly).toBe(false);
    }
  });

  it("parses favoritesOnly=true from a URL search param string", () => {
    const result = promptListParamsSchema.safeParse({ favoritesOnly: "true" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.favoritesOnly).toBe(true);
    }
  });

  it("treats favoritesOnly=false explicitly as false", () => {
    const result = promptListParamsSchema.safeParse({ favoritesOnly: "false" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.favoritesOnly).toBe(false);
    }
  });

  it("PAGE_SIZE is a sane positive number", () => {
    expect(PAGE_SIZE).toBeGreaterThan(0);
  });
});

describe("toggleFavoriteSchema", () => {
  it("accepts a valid id with true", () => {
    const result = toggleFavoriteSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      isFavorite: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid id with false", () => {
    const result = toggleFavoriteSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      isFavorite: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid id", () => {
    const result = toggleFavoriteSchema.safeParse({
      id: "not-a-uuid",
      isFavorite: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-boolean isFavorite", () => {
    const result = toggleFavoriteSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      isFavorite: "true",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCategorySchema", () => {
  it("accepts a valid name", () => {
    expect(createCategorySchema.safeParse({ name: "Writing" }).success).toBe(
      true,
    );
  });

  it("rejects a blank name", () => {
    expect(createCategorySchema.safeParse({ name: "   " }).success).toBe(
      false,
    );
  });

  it("rejects a name over 100 characters", () => {
    expect(
      createCategorySchema.safeParse({ name: "a".repeat(101) }).success,
    ).toBe(false);
  });
});
