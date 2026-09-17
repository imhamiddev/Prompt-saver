"use client";

import { useActionState, useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadPromptImage, type ImageActionResult } from "@/actions/prompt-images";
import { MAX_IMAGES_PER_PROMPT } from "@/lib/validations/prompt-image";
import { useFormStatus } from "react-dom";

const initialState: ImageActionResult = { error: null };

function UploadTrigger({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled || pending}
        onChange={(e) => {
          if (e.target.files?.length) {
            e.target.form?.requestSubmit();
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <ImagePlus />
        )}
        {pending ? "Uploading..." : "Add image"}
      </Button>
    </>
  );
}

export function ImageUploader({
  promptId,
  currentCount,
}: {
  promptId: string;
  currentCount: number;
}) {
  const [state, formAction] = useActionState(uploadPromptImage, initialState);
  const atLimit = currentCount >= MAX_IMAGES_PER_PROMPT;

  return (
    <div className="flex flex-col gap-2">
      {/* key={currentCount} remounts the form (and its file input) after
          every successful upload, since revalidatePath changes
          currentCount - this clears the selected file without needing to
          chain a promise off the action dispatch, which useActionState
          doesn't expose. */}
      <form
        key={currentCount}
        action={formAction}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="promptId" value={promptId} />
        <UploadTrigger disabled={atLimit} />
        <span className="text-xs text-muted-foreground">
          {currentCount}/{MAX_IMAGES_PER_PROMPT} images
        </span>
      </form>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {atLimit && !state.error && (
        <p className="text-xs text-muted-foreground">
          Maximum of {MAX_IMAGES_PER_PROMPT} images reached. Delete one to add another.
        </p>
      )}
    </div>
  );
}
