"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavoritesFilterToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = searchParams.get("favoritesOnly") === "true";

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString());
    if (isActive) {
      params.delete("favoritesOnly");
    } else {
      params.set("favoritesOnly", "true");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Button
      type="button"
      variant={isActive ? "default" : "outline"}
      size="default"
      onClick={handleClick}
      aria-pressed={isActive}
    >
      <Star className={cn("size-4", isActive && "fill-current")} />
      Favorites
    </Button>
  );
}
