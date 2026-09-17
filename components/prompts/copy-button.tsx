"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  text,
  className,
  size = "sm",
}: {
  text: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail (permissions, insecure context); fail
      // silently rather than showing a scary error for a low-stakes action.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn(className)}
      onClick={handleCopy}
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
