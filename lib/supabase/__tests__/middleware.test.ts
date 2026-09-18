import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @supabase/ssr's createServerClient so we can control what
// auth.getUser() returns, without needing a real Supabase project.
const mockGetUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// Import after the mock is registered.
const { updateSession } = await import("../middleware");

function makeRequest(pathname: string) {
  return new NextRequest(new URL(pathname, "http://localhost:3000"));
}

beforeEach(() => {
  mockGetUser.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
});

describe("updateSession route protection", () => {
  it("redirects an unauthenticated user away from a protected route", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await updateSession(makeRequest("/dashboard"));

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("redirectTo=%2Fdashboard");
  });

  it("does NOT redirect an unauthenticated user on a public route", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await updateSession(makeRequest("/login"));

    // NextResponse.next() has status 200 and no location header.
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an authenticated user away from /login to /dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@example.com" } },
    });

    const response = await updateSession(makeRequest("/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("redirects an authenticated user away from /register to /dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@example.com" } },
    });

    const response = await updateSession(makeRequest("/register"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("does NOT redirect an unauthenticated user on /verify-email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await updateSession(makeRequest("/verify-email"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an authenticated user away from /verify-email to /dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@example.com" } },
    });

    const response = await updateSession(makeRequest("/verify-email"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("allows an authenticated user through to a protected route", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@example.com" } },
    });

    const response = await updateSession(makeRequest("/dashboard"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows an unauthenticated user through to the public landing page", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await updateSession(makeRequest("/"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("does NOT redirect an unauthenticated user on /forgot-password", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await updateSession(makeRequest("/forgot-password"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an authenticated user away from /forgot-password to /dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@example.com" } },
    });

    const response = await updateSession(makeRequest("/forgot-password"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("redirects a user with NO session away from /reset-password to /forgot-password", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const response = await updateSession(makeRequest("/reset-password"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/forgot-password");
  });

  it("allows a user WITH a session through to /reset-password (recovery session case)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "a@example.com" } },
    });

    const response = await updateSession(makeRequest("/reset-password"));

    // Critically, this must NOT redirect to /dashboard the way other
    // AUTH_PAGE_PATHS do for an authenticated user - that would break
    // the password recovery flow, since a recovery session is
    // indistinguishable from a normal session at this level.
    expect(response.headers.get("location")).toBeNull();
  });
});
