"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadPromptImage, type ImageActionResult } from "@/actions/prompt-images";
import { MAX_IMAGES_PER_PROMPT, validateImageFile } from "@/lib/validations/prompt-image";
import { compressImageForUpload } from "@/lib/compress-image";

const initialState: ImageActionResult = { error: null };

export function ImageUploader({
  promptId,
  currentCount,
}: {
  promptId: string;
  currentCount: number;
}) {
  const [state, formAction] = useActionState(uploadPromptImage, initialState);
  const [compressing, startCompressing] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = currentCount >= MAX_IMAGES_PER_PROMPT;
  const busy = compressing;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input immediately so selecting the *same* file again
    // later (e.g. after an error) still fires onChange.
    e.target.value = "";
    if (!file) return;

    setLocalError(null);

    // Validate the original file up front (type/size-of-original sanity
    // check) before spending time compressing something we'd reject
    // anyway - e.g. a non-image file has nothing to compress.
    const fileTypeError = file.type.startsWith("image/")
      ? null
      : "Only JPEG, PNG, WebP, or GIF images are allowed.";
    if (fileTypeError) {
      setLocalError(fileTypeError);
      return;
    }

    startCompressing(async () => {
      const processedFile = await compressImageForUpload(file);

      // Re-validate after compression: this catches the case where the
      // original was so large that even compression couldn't bring it
      // under the bucket's hard limit (see MAX_IMAGE_SIZE_BYTES).
      const postCompressionError = validateImageFile(processedFile);
      if (postCompressionError) {
        setLocalError(postCompressionError);
        return;
      }

      const formData = new FormData();
      formData.set("promptId", promptId);
      formData.set("file", processedFile);
      formAction(formData);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={atLimit || busy}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={atLimit || busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus />
          )}
          {busy ? "Optimizing..." : "Add image"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {currentCount}/{MAX_IMAGES_PER_PROMPT} images
        </span>
      </div>
      {(localError || state.error) && (
        <p role="alert" className="text-sm text-destructive">
          {localError ?? state.error}
        </p>
      )}
      {atLimit && !localError && !state.error && (
        <p className="text-xs text-muted-foreground">
          Maximum of {MAX_IMAGES_PER_PROMPT} images reached. Delete one to add another.
        </p>
      )}
    </div>
  );
}
