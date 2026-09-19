"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCopyShortcut } from "@/hooks/use-copy-shortcut";

export function CopyButton({
  text,
  className,
  size = "sm",
  enableShortcut = false,
}: {
  text: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  /** Also copy on Cmd/Ctrl+C anywhere on the page (see useCopyShortcut
   * for when it defers instead, e.g. an input is focused). Only one
   * CopyButton per page should set this to true. */
  enableShortcut?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail (permissions, insecure context); fail
      // silently rather than showing a scary error for a low-stakes action.
    }
  }, [text]);

  // Routes the keyboard shortcut through the exact same handler as the
  // click, so the "Copied" feedback stays in sync regardless of which
  // way the user triggered it.
  useCopyShortcut(handleCopy, enableShortcut);

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn(className)}
      onClick={handleCopy}
      title={enableShortcut ? "Copy (Ctrl/Cmd+C)" : undefined}
    >
      {copied ? (
        <>
          <Check /> Copied
        </>
      ) : (
        <>
          <Copy /> Copy
        </>
      )}
    </Button>
  );
}
