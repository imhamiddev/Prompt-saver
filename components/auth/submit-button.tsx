"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";

type SubmitButtonProps = ComponentProps<typeof Button> & {
  pendingText?: string;
};

/**
 * A Button that automatically disables itself and shows a spinner while
 * the enclosing <form action={...}> Server Action is in flight (spec
 * section 25: every async operation needs a loading state).
 */
export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {pending ? pendingText ?? children : children}
    </Button>
  );
}
