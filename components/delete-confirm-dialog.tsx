"use client";

import { useActionState, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SubmitButton } from "@/components/auth/submit-button";
import { buttonVariants } from "@/components/ui/button";

type ActionResult = { error: string | null };

/**
 * Generic "are you sure?" dialog that wraps a single hidden-id Server
 * Action form (used for deleting a prompt or a category). Spec section
 * 14/17: destructive actions must be confirmed before they run.
 */
export function DeleteConfirmDialog({
  trigger,
  title,
  description,
  action,
  hiddenFields,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  action: (
    prevState: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  hiddenFields: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionResult, FormData>(
    action,
    { error: null },
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <form action={formAction} className="contents">
            {Object.entries(hiddenFields).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            <SubmitButton
              pendingText="Deleting..."
              className={buttonVariants({ variant: "destructive" })}
            >
              Delete
            </SubmitButton>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
