import Link from "next/link";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/prompts/copy-button";
import { FavoriteButton } from "@/components/prompts/favorite-button";
import type { PromptWithCategory } from "@/lib/queries/prompts";

export function PromptCard({ prompt }: { prompt: PromptWithCategory }) {
  return (
    <Card className="relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      {/* Covers the whole card so clicking anywhere (except the copy
          button, which stops propagation via its own z-index/pointer
          handling) opens the prompt - while the title link underneath
          still works for keyboard/screen-reader navigation. */}
      <Link
        href={`/prompts/${prompt.id}`}
        className="absolute inset-0 z-0"
        aria-label={prompt.title}
      />

      {prompt.coverImageUrl && (
        <div className="relative aspect-video w-full overflow-hidden border-b bg-muted">
          <Image
            src={prompt.coverImageUrl}
            alt=""
            fill
            sizes="400px"
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      <FavoriteButton
        promptId={prompt.id}
        initialIsFavorite={prompt.is_favorite}
        className="absolute right-1.5 top-1.5 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
      />

      <CardHeader className="relative z-10 pointer-events-none">
        <CardTitle className="line-clamp-2 pr-8">{prompt.title}</CardTitle>
        {prompt.category && (
          <Badge variant="secondary" className="w-fit">
            {prompt.category.name}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="relative z-10 flex-1 pointer-events-none">
        <p className="line-clamp-4 text-sm text-muted-foreground whitespace-pre-line">
          {prompt.prompt_text}
        </p>
      </CardContent>
      <CardFooter className="relative z-10 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {new Date(prompt.updated_at).toLocaleDateString()}
        </span>
        <CopyButton text={prompt.prompt_text} className="pointer-events-auto" />
      </CardFooter>
    </Card>
  );
}
