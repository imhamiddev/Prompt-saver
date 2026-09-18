import { describe, expect, it } from "vitest";
import { otpCodeSchema, verifyOtpSchema, resendOtpSchema } from "../auth";

describe("otpCodeSchema", () => {
  it("accepts a 6-digit code", () => {
    expect(otpCodeSchema.safeParse("123456").success).toBe(true);
  });

  it("trims surrounding whitespace", () => {
    const result = otpCodeSchema.safeParse("  123456  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("123456");
    }
  });

  it("rejects a code that is too short", () => {
    expect(otpCodeSchema.safeParse("12345").success).toBe(false);
  });

  it("rejects a code that is too long", () => {
    expect(otpCodeSchema.safeParse("1234567").success).toBe(false);
  });

  it("rejects a code with non-digit characters", () => {
    expect(otpCodeSchema.safeParse("12a456").success).toBe(false);
  });
});

describe("verifyOtpSchema", () => {
  it("accepts a valid email + code pair", () => {
    const result = verifyOtpSchema.safeParse({
      email: "user@example.com",
      token: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = verifyOtpSchema.safeParse({
      email: "not-an-email",
      token: "123456",
    });
    expect(result.success).toBe(false);
  });
});

describe("resendOtpSchema", () => {
  it("accepts a valid email", () => {
    expect(
      resendOtpSchema.safeParse({ email: "user@example.com" }).success,
    ).toBe(true);
  });

  it("rejects a missing email", () => {
    expect(resendOtpSchema.safeParse({}).success).toBe(false);
  });
});
