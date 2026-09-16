"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthActionResult } from "@/actions/auth";
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

export function RegisterForm() {
  const [state, formAction] = useActionState(register, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Create an account</CardTitle>
        <CardDescription>
          Start building your private library of AI prompts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={!!state.fieldErrors?.password}
            />
            <FieldError messages={state.fieldErrors?.password} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={!!state.fieldErrors?.confirmPassword}
            />
            <FieldError messages={state.fieldErrors?.confirmPassword} />
          </div>

          <SubmitButton className="mt-2 w-full" pendingText="Creating account...">
            Create account
          </SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
