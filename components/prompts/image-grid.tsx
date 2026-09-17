"use client";

import Image from "next/image";
import { useActionState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  deletePromptImage,
  type ImageActionResult,
} from "@/actions/prompt-images";
import type { PromptImageWithUrl } from "@/lib/queries/prompt-images";

const initialState: ImageActionResult = { error: null };

export function ImageGrid({ images }: { images: PromptImageWithUrl[] }) {
  if (images.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No images attached.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {images.map((image) => (
        <ImageTile key={image.id} image={image} />
      ))}
    </div>
  );
}

function ImageTile({ image }: { image: PromptImageWithUrl }) {
  const [state, formAction] = useActionState(deletePromptImage, initialState);

  return (
    <div className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
      {image.signedUrl ? (
        <Image
          src={image.signedUrl}
          alt=""
          fill
          sizes="200px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          Unavailable
        </div>
      )}

      <form action={formAction} className="absolute right-1 top-1">
        <input type="hidden" name="id" value={image.id} />
        <Button
          type="submit"
          variant="destructive"
          size="icon"
          className="size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Delete image"
        >
          <X className="size-3.5" />
        </Button>
      </form>

      {state.error && (
        <p
          role="alert"
          className="absolute inset-x-0 bottom-0 bg-destructive/90 px-1 py-0.5 text-center text-[10px] text-destructive-foreground"
        >
          {state.error}
        </p>
      )}
    </div>
  );
}
