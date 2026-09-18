"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthActionResult } from "@/actions/auth";
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

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>
          Welcome back. Enter your details to access your prompts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          {redirectTo && (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          )}

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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link href="/forgot-password">Forgot password?</Link>
              </Button>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={!!state.fieldErrors?.password}
            />
            <FieldError messages={state.fieldErrors?.password} />
          </div>

          <SubmitButton className="mt-2 w-full" pendingText="Logging in...">
            Log in
          </SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href="/register">Create one</Link>
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
