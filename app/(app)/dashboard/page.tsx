import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/prompts/search-bar";
import { CategoryFilter } from "@/components/prompts/category-filter";
import { FavoritesFilterToggle } from "@/components/prompts/favorites-filter-toggle";
import { PromptCard } from "@/components/prompts/prompt-card";
import { PromptsPagination } from "@/components/prompts/prompts-pagination";
import { getPrompts } from "@/lib/queries/prompts";
import { getCategories } from "@/lib/queries/categories";
import { promptListParamsSchema } from "@/lib/validations/prompt";

export const metadata: Metadata = {
  title: "Dashboard — Prompt Manager",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoryId?: string;
    favoritesOnly?: string;
    page?: string;
  }>;
}) {
  const rawParams = await searchParams;
  const parsedParams = promptListParamsSchema.safeParse(rawParams);
  const params = parsedParams.success
    ? parsedParams.data
    : { page: 1 as const, favoritesOnly: false };

  const [categories, { prompts, totalCount, page, totalPages }] =
    await Promise.all([getCategories(), getPrompts(params)]);

  const hasFilters = Boolean(
    params.q || params.categoryId || params.favoritesOnly,
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your prompts
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} prompt{totalCount === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/prompts/new">
            <Plus /> New prompt
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar />
        <CategoryFilter categories={categories} />
        <FavoritesFilterToggle />
      </div>

      {prompts.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
          <PromptsPagination
            basePath="/dashboard"
            currentParams={{
              q: params.q,
              categoryId: params.categoryId,
              favoritesOnly: params.favoritesOnly ? "true" : undefined,
            }}
            page={page}
            totalPages={totalPages}
          />
        </>
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-24 text-center">
        <p className="font-medium">No prompts match your search</p>
        <p className="text-sm text-muted-foreground">
          Try a different search term or clear your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-24 text-center">
      <div>
        <p className="font-medium">No prompts yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first prompt to get started.
        </p>
      </div>
      <Button asChild>
        <Link href="/prompts/new">
          <Plus /> New prompt
        </Link>
      </Button>
    </div>
  );
}
