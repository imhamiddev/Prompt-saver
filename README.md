# Prompt Manager

A private, per-user library for saving, organizing, searching, and reusing AI prompts — with optional images attached to each prompt (up to 5 per prompt).

Built with Next.js 16 (App Router), TypeScript, Supabase (Auth + Postgres + Storage), and shadcn/ui.

---

## Table of contents

- [Status of this build](#status-of-this-build)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [1. Create a Supabase project](#1-create-a-supabase-project)
- [2. Run the database migrations](#2-run-the-database-migrations)
- [3. Configure environment variables](#3-configure-environment-variables)
- [4. Run locally](#4-run-locally)
- [5. Deploy to Vercel](#5-deploy-to-vercel)
- [Testing](#testing)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)

---

## Status of this build

Every line of code in this repository has been written, type-checked, linted, and built successfully (`tsc --noEmit`, `eslint`, `npm run build` all pass with zero errors/warnings). The database migrations have been executed and functionally tested against a real PostgreSQL instance (RLS policies, ownership triggers, the 5-image cap, and Storage policies were all verified with 17 passing SQL test cases — see `supabase/test/`). Application logic (validation, route protection, middleware redirects) is covered by 50 passing unit tests (`npx vitest run`).

**What has *not* been tested end-to-end:** this was built in a sandboxed environment without Docker, so it was never connected to a real, running Supabase project. No one has actually signed up, logged in, created a prompt, or uploaded an image against a live database. The code is written correctly and the logic has been verified in isolation, but you should treat the very first real run (after following the setup steps below) as the first true integration test. Please report anything that doesn't work as expected.

## Tech stack

- **Next.js 16** (App Router, Turbopack, Server Components + Server Actions)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (new-york style, neutral base color) + Radix primitives
- **Supabase**: Postgres, Auth, Storage, Row Level Security
- **Zod** + **React Hook Form** conventions for validation
- **Vitest** for unit tests

## Project structure

```
app/
  (public)/            → landing, login, register (unauthenticated routes)
  (app)/                → dashboard, prompts/new, prompts/[id], prompts/[id]/edit
                          (protected — see proxy.ts)
actions/                → Server Actions (create/update/delete for auth,
                          categories, prompts, images)
lib/
  supabase/             → browser client, server client, session middleware
  validations/          → Zod schemas (single source of truth for both
                          client-side and server-side validation)
  queries/               → read-only data access (server-only)
  rate-limit.ts          → lightweight in-memory rate limiter
components/
  ui/                    → shadcn/ui components
  prompts/, categories/, auth/ → feature components
types/database.types.ts  → hand-written types matching the migrations
                          (regenerate with the Supabase CLI once you have
                          a live project — see below)
proxy.ts                 → Next.js 16's middleware convention: refreshes
                          the Supabase session and protects routes
supabase/
  migrations/            → SQL migrations (run these against your project)
  test/                  → local-only SQL test harness (not part of the
                          app; see "Testing" below)
```

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (choose any region close to you).
2. Wait for provisioning to finish, then open **Project Settings → API**. You'll need two values from here in step 3:
   - **Project URL**
   - **anon public key**
3. (Optional, only if you ever need server-only admin access outside of RLS) note the **service_role key** from the same page — but **never** put it in any `NEXT_PUBLIC_*` variable or client code.

## 2. Run the database migrations

The SQL files in `supabase/migrations/` create every table, index, trigger, RLS policy, and Storage bucket/policy this app needs, in order:

| File | Creates |
|---|---|
| `20260916234100_helper_functions.sql` | shared `updated_at` trigger function |
| `20260916234200_categories.sql` | `categories` table + RLS |
| `20260916234300_prompts.sql` | `prompts` table, full-text search, category-ownership trigger, RLS |
| `20260916234400_prompt_images.sql` | `prompt_images` table, 5-image cap trigger, RLS |
| `20260916234500_storage.sql` | the `prompt-images` Storage bucket + ownership-based Storage policies |

### Option A — Supabase CLI (recommended)

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>   # find this in your project's URL/settings
supabase db push
```

This applies every file in `supabase/migrations/` in order.

### Option B — SQL Editor (manual)

If you don't want to install the CLI, open **SQL Editor** in the Supabase dashboard and run each file's contents, **in the order listed above** (the trigger functions and `categories` table must exist before `prompts` is created, etc).

### After migrating: regenerate types (recommended)

`types/database.types.ts` was hand-written to match these migrations exactly. Once your project is linked, you can regenerate it directly from the live schema so it never drifts:

```bash
npx supabase gen types typescript --project-id <your-project-ref> > types/database.types.ts
```

### Required: allow the auth callback URL

The password reset flow (and, more generally, any Supabase email link) redirects back to `/auth/confirm` in this app. Supabase blocks redirects to URLs it doesn't recognize, so you must add this as an allowed redirect:

1. In the Supabase dashboard, go to **Authentication → URL Configuration**.
2. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/confirm` (for local development)
   - `https://your-app.vercel.app/auth/confirm` (once deployed — see step 5)

Without this, clicking a password-reset (or signup confirmation) link will fail with an error from Supabase instead of reaching the app.

## 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values from step 1:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=           # optional, leave blank unless you need it
```

The anon key is safe to expose to the browser — every table has Row Level Security enabled, so access control is enforced by Postgres itself, not by keeping this key secret. The service role key is different: it bypasses RLS entirely and must never be exposed to the browser or committed anywhere. This app doesn't require it for normal operation.

### Email confirmation (link-based)

By default, and as this app is built, Supabase emails a **confirmation link** (`{{ .ConfirmationURL }}`) when someone registers — the user clicks it, Supabase verifies them, and they land back on `/dashboard`. No dashboard configuration is required for this to work; it's the default behavior.

### Using nicer email templates (optional)

Supabase's default email templates are plain and unstyled. This repo includes designed, email-client-safe HTML versions you can paste in as-is:

- `supabase/email-templates/confirm-signup.html` → paste into **Authentication → Emails → Confirm signup**
- `supabase/email-templates/reset-password.html` → paste into **Authentication → Emails → Reset password**

**Important — as of June 2026, Supabase free-tier projects using the default (built-in) email sender can no longer edit these templates at all.** The dashboard fields for subject/body are read-only until you either configure a custom SMTP provider or upgrade to a paid plan. Projects created before June 3, 2026 are grandfathered and keep full editing access on the default sender. If your dashboard fields are greyed out, this is why.

To unlock template editing on a new free-tier project, set up a free custom SMTP provider — [Resend](https://resend.com) works well and its free tier (3,000 emails/day) is more than enough for this app:

1. Create a Resend account and generate an API key (**Resend dashboard → API Keys**). For quick testing you can send from `onboarding@resend.dev` with no domain setup; to send to addresses other than your own Resend account email, verify your own domain under **Resend → Domains** instead.
2. In Supabase: **Authentication → Emails → SMTP Settings**, enable **Custom SMTP**, and fill in:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: the Resend API key from step 1
   - Sender email / name: whatever you'd like users to see
3. Save. The Confirm signup / Reset password template fields should now be editable — paste in the HTML files above.

### Why the reset-password link looks unusual (and why not to "simplify" it)

`supabase/email-templates/reset-password.html`'s link doesn't point straight at `/auth/confirm?token_hash=...` — it points at `/reset-password/start#confirm_url=...`, with the real link stuffed into the URL *fragment* (after `#`) instead of the query string.

This is intentional, and fixes a very common real-world bug: many email clients and corporate security scanners "prefetch" (silently open) links inside emails to check for phishing before a person ever clicks. Since the reset token is single-use, that prefetch silently consumes it — so when the person then clicks the link themselves, Supabase rejects it with `otp_expired` / "Email link is invalid or has expired", even though nothing was actually wrong with the request. `/reset-password/start` (`app/(public)/reset-password/start/page.tsx`) reads the real link from the fragment client-side (fragments are never sent to a server, so prefetchers can't see or consume it) and requires an explicit "Continue" click before following it — so the token is only ever consumed by an intentional user action. Don't change this link back to a direct `/auth/confirm` URL; it will reintroduce that bug.

If you'd rather not deal with SMTP at all, that's fine too — the app works correctly either way; you'll just be stuck with Supabase's plain default email design (and, on the free tier, the 2-3 emails/hour cap) until you configure it.

## 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should be able to register a new account, log in, create a prompt, attach images, search/filter/paginate, and edit/delete — all backed by your Supabase project.

## 5. Deploy to Vercel

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. In [Vercel](https://vercel.com), click **New Project** and import the repository.
3. Under **Environment Variables**, add the same three variables from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` if you use it).
4. Deploy. Vercel auto-detects Next.js and uses the correct build command (`next build`).
5. Once deployed, go back to your Supabase project's **Authentication → URL Configuration** and add your Vercel URL (e.g. `https://your-app.vercel.app`) to **Site URL** and **Redirect URLs**, so auth flows work correctly in production.

### Optional: restore Google Fonts

During development in this project's build sandbox, `next/font/google` (Geist) was swapped for the system font stack in `app/layout.tsx` and `app/globals.css`, because that sandbox had no network access to `fonts.googleapis.com`. Vercel's build environment has normal internet access, so if you'd like the original Geist font back, you can restore it — see the git history of `app/layout.tsx` for the original `next/font/google` usage, or just re-add:

```ts
import { Geist, Geist_Mono } from "next/font/google";
```

This is purely cosmetic and has no effect on functionality.

---

## Testing

Two independent layers of testing were done during development:

**1. SQL functional tests** (`supabase/test/`) — a local-only harness that stubs the parts of Supabase's platform schema (`auth.users`, `auth.uid()`, `storage.objects`) so the real migrations in `supabase/migrations/` can be executed and exercised against an actual PostgreSQL instance. This is **not** part of the application and does not need to be run against your Supabase project — it was used once during development to prove the RLS policies, ownership triggers, and constraints work as intended. You can safely ignore or delete the `supabase/test/` folder.

**2. Unit tests** (Vitest) — cover validation schemas and the auth/route-protection middleware logic:

```bash
npx vitest run
```

**3. Static checks** — should always pass cleanly:

```bash
npx tsc --noEmit   # type-check
npx eslint .        # lint
npm run build        # production build
```

## Security notes

- **Row Level Security is the primary access control mechanism.** Every table (`categories`, `prompts`, `prompt_images`) has RLS enabled and forced, scoped to `auth.uid()`. Server Actions add an explicit `.eq("user_id", ...)` filter as defense in depth, but RLS is what actually prevents cross-user access even if application code has a bug.
- **Cross-table ownership** (e.g. a prompt's `category_id` must belong to the same user) is enforced by database triggers, since a plain foreign key can't express that.
- **The 5-image-per-prompt limit** is enforced in three places: the upload UI (disables the button), the Server Action (checks before uploading), and a database trigger (the actual backstop).
- **Images are private.** The `prompt-images` Storage bucket is not public; the app generates short-lived signed URLs (1 hour) server-side for each image, and Storage-level RLS policies additionally ensure a user can only read/write objects under their own `{user_id}/...` folder.
- **Error messages shown to users are generic.** Raw Postgres/Supabase error text is logged server-side (`console.error`) but never sent to the client, to avoid leaking internal details.
- **Rate limiting** on login/register is implemented as a simple in-memory limiter (`lib/rate-limit.ts`) as defense-in-depth alongside Supabase Auth's own built-in rate limiting. On serverless platforms like Vercel, each function instance has its own memory, so this limiter is per-instance, not global — it raises the bar but isn't a hard guarantee under distributed abuse. For a stricter guarantee, swap it for a shared store (e.g. Upstash Redis) behind the same `checkRateLimit` function signature.
- **Security headers** (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are set in `next.config.ts`.
- **Never commit `.env.local`** — it's already in `.gitignore`. Only `.env.example` (with blank values) is tracked.

## Known limitations

- As noted above, this was built and tested without a live Supabase connection. Treat your first real run as the first integration test.
- **The password reset flow requires the redirect URL step above.** Until `<your-site>/auth/confirm` is added under Authentication → URL Configuration → Redirect URLs, clicking a reset-password (or signup confirmation) link will fail with a Supabase error instead of reaching the app.
- The rate limiter is per-instance in-memory (see Security notes).
- Category deletion is blocked (`ON DELETE RESTRICT`) if the category still has prompts in it — the UI surfaces a clear error, but there's no "move these prompts to another category first" bulk-reassignment flow yet.
- There is no image reordering *UI* yet — the underlying Server Action (`reorderPromptImages` in `actions/prompt-images.ts`) and database support (`display_order`) exist, but no drag-and-drop interface has been wired up in the details page.
