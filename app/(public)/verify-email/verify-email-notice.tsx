"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { resendConfirmationEmail, type AuthActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthActionResult = { error: null };

export function VerifyEmailNotice({ email }: { email: string }) {
  const [resendState, resendAction] = useActionState(
    resendConfirmationEmail,
    initialState,
  );
  const [justResent, setJustResent] = useState(false);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription>
          We sent a confirmation link to{" "}
          <span className="font-medium">{email}</span>. Click it to finish
          creating your account, then come back and log in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 text-center">
        <form
          action={(formData) => {
            setJustResent(true);
            resendAction(formData);
          }}
        >
          <input type="hidden" name="email" value={email} />
          <SubmitButton variant="outline" size="sm" pendingText="Sending...">
            Resend the email
          </SubmitButton>
        </form>

        {justResent && !resendState.error && (
          <p className="text-xs text-muted-foreground">
            If that address has an account, a new confirmation email is on
            its way.
          </p>
        )}
        {resendState.error && (
          <p role="alert" className="text-xs text-destructive">
            {resendState.error}
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          Already confirmed?{" "}
          <Button variant="link" className="h-auto p-0 text-sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </p>
      </CardContent>
    </Card>
  );
}
