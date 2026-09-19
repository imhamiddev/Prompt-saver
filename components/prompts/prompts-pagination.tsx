import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function buildHref(
  basePath: string,
  currentParams: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentParams)) {
    if (value) params.set(key, value);
  }
  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function PromptsPagination({
  basePath,
  currentParams,
  page,
  totalPages,
}: {
  basePath: string;
  currentParams: { q?: string; categoryId?: string; favoritesOnly?: string };
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={buildHref(basePath, currentParams, Math.max(1, page - 1))}
            aria-disabled={page === 1}
            tabIndex={page === 1 ? -1 : undefined}
            className={page === 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        {pageNumbers.map((num) => (
          <PaginationItem key={num}>
            <PaginationLink
              href={buildHref(basePath, currentParams, num)}
              isActive={num === page}
            >
              {num}
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href={buildHref(
              basePath,
              currentParams,
              Math.min(totalPages, page + 1),
            )}
            aria-disabled={page === totalPages}
            tabIndex={page === totalPages ? -1 : undefined}
            className={
              page === totalPages ? "pointer-events-none opacity-50" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
