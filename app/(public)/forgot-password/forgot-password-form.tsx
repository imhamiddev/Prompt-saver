"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { forgotPassword, type AuthActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/submit-button";
import { FieldError } from "@/components/auth/field-error";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthActionResult = { error: null };

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPassword, initialState);
  const [submittedEmail, setSubmittedEmail] = useState("");

  // Show the "check your email" screen once the action has actually
  // resolved successfully (no error) for a submitted email. Using
  // `state` identity here (rather than a separate "submitted" flag set
  // synchronously at submit time) means this reflects the real result,
  // including the rate-limit error case.
  const showSuccess = submittedEmail !== "" && !state.error;

  if (showSuccess) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Check your email</CardTitle>
          <CardDescription>
            If an account exists for{" "}
            <span className="font-medium">{submittedEmail}</span>, we sent a
            link to reset your password. It may take a minute to arrive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Button variant="link" className="h-auto p-0 text-sm" asChild>
              <Link href="/login">Back to log in</Link>
            </Button>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Forgot your password?</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) => {
            setSubmittedEmail(String(formData.get("email") ?? ""));
            formAction(formData);
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          {state.error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              aria-invalid={!!state.fieldErrors?.email}
            />
            <FieldError messages={state.fieldErrors?.email} />
          </div>

          <SubmitButton className="mt-2 w-full" pendingText="Sending...">
            Send reset link
          </SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href="/login">Back to log in</Link>
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
