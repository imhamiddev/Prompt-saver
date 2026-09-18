import { describe, expect, it } from "vitest";
import { resendConfirmationEmailSchema } from "../auth";

describe("resendConfirmationEmailSchema", () => {
  it("accepts a valid email", () => {
    expect(
      resendConfirmationEmailSchema.safeParse({ email: "user@example.com" })
        .success,
    ).toBe(true);
  });

  it("rejects a missing email", () => {
    expect(resendConfirmationEmailSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(
      resendConfirmationEmailSchema.safeParse({ email: "not-an-email" })
        .success,
    ).toBe(false);
  });
});
