"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  verifyRegistrationOtp,
  resendRegistrationOtp,
  type AuthActionResult,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const initialState: AuthActionResult = { error: null };

export function VerifyEmailForm({ email }: { email: string }) {
  const [state, formAction] = useActionState(
    verifyRegistrationOtp,
    initialState,
  );
  const [resendState, resendAction] = useActionState(
    resendRegistrationOtp,
    initialState,
  );
  const [code, setCode] = useState("");
  const [justResent, setJustResent] = useState(false);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <span className="font-medium">{email}</span>.
          Enter it below to finish creating your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="email" value={email} />

          {state.error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          )}

          <div className="flex flex-col items-center gap-2">
            <Label htmlFor="token" className="self-start">
              Verification code
            </Label>
            <input type="hidden" name="token" value={code} />
            <InputOTP
              maxLength={6}
              value={code}
              onChange={setCode}
              aria-invalid={!!state.fieldErrors?.token}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <FieldError messages={state.fieldErrors?.token} />
          </div>

          <SubmitButton
            className="mt-2 w-full"
            pendingText="Verifying..."
            disabled={code.length !== 6}
          >
            Verify and continue
          </SubmitButton>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <form
            action={(formData) => {
              setJustResent(true);
              resendAction(formData);
            }}
          >
            <input type="hidden" name="email" value={email} />
            <Button
              type="submit"
              variant="link"
              className="h-auto p-0 text-sm"
            >
              Didn&apos;t get a code? Resend it
            </Button>
          </form>
          {justResent && !resendState.error && (
            <p className="text-xs text-muted-foreground">
              A new code has been sent, if that address has an account.
            </p>
          )}
          {resendState.error && (
            <p role="alert" className="text-xs text-destructive">
              {resendState.error}
            </p>
          )}

          <p>
            Wrong email?{" "}
            <Button variant="link" className="h-auto p-0 text-sm" asChild>
              <Link href="/register">Start over</Link>
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
