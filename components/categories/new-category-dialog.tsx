"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/auth/submit-button";
import { FieldError } from "@/components/auth/field-error";
import {
  createCategory,
  type CategoryActionResult,
} from "@/actions/categories";

const initialState: CategoryActionResult = { error: null };

export function NewCategoryDialog({
  onCreated,
}: {
  /** Called after a successful create, so the caller can revalidate and
   * let the user pick the new category from the now-updated list. */
  onCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createCategory, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Adjusting state during render (React-endorsed pattern: see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  // This only touches React state (setOpen) - no DOM/ref access, no
  // external side effects - so it's safe to do directly during render
  // rather than in a useEffect.
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) {
      setOpen(false);
    }
  }

  // The actual external side effects (resetting the DOM form, notifying
  // the parent) belong in a real effect, keyed on the same transition.
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onCreated?.();
    }
  }, [state, onCreated]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus /> New category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New category</DialogTitle>
          <DialogDescription>
            Give it a short, descriptive name.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-category-name">Name</Label>
            <Input
              id="new-category-name"
              name="name"
              placeholder="e.g. Writing"
              required
              maxLength={100}
              aria-invalid={!!state.fieldErrors?.name}
            />
            <FieldError messages={state.fieldErrors?.name} />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton pendingText="Creating...">Create</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
