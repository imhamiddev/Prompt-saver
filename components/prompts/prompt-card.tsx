import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/prompts/copy-button";
import type { PromptWithCategory } from "@/lib/queries/prompts";

export function PromptCard({ prompt }: { prompt: PromptWithCategory }) {
  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-2">
            <Link
              href={`/prompts/${prompt.id}`}
              className="hover:underline"
            >
              {prompt.title}
            </Link>
          </CardTitle>
        </div>
        {prompt.category && (
          <Badge variant="secondary" className="w-fit">
            {prompt.category.name}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <p className="line-clamp-4 text-sm text-muted-foreground whitespace-pre-line">
          {prompt.prompt_text}
        </p>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {new Date(prompt.updated_at).toLocaleDateString()}
        </span>
        <CopyButton text={prompt.prompt_text} />
      </CardFooter>
    </Card>
  );
}
