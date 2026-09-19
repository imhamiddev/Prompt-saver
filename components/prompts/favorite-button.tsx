"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/actions/prompts";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  promptId,
  initialIsFavorite,
  className,
  size = "icon",
}: {
  promptId: string;
  initialIsFavorite: boolean;
  className?: string;
  size?: "icon" | "sm";
}) {
  // Optimistic: flip immediately on click, then reconcile with the
  // server result. If the call fails, revert and show a brief error.
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent) {
    // Prevent the click from also triggering an ancestor <Link> (the
    // dashboard's PromptCard makes the whole card clickable via an
    // absolutely-positioned Link).
    e.preventDefault();
    e.stopPropagation();

    const next = !isFavorite;
    setIsFavorite(next);
    setError(null);

    startTransition(async () => {
      const result = await toggleFavorite(promptId, next);
      if (result.error) {
        setIsFavorite(!next); // revert
        setError(result.error);
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === "icon" ? "icon" : "sm"}
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      title={error ?? undefined}
      className={cn("pointer-events-auto", className)}
    >
      <Star
        className={cn(
          "size-4 transition-colors",
          isFavorite && "fill-yellow-400 text-yellow-500",
        )}
      />
    </Button>
  );
}
