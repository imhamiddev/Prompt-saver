-- ============================================================================
-- prompts
-- ============================================================================
-- Each prompt belongs to exactly one user and references one category
-- owned by that same user (enforced by a trigger below, since a plain FK
-- cannot cross-check ownership between two tables).

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  title text not null,
  prompt_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint prompts_title_not_blank check (btrim(title) <> ''),
  constraint prompts_title_length check (char_length(title) <= 200),
  constraint prompts_prompt_text_not_blank check (btrim(prompt_text) <> ''),
  -- Generous but bounded: spec asks not to impose a small limit while still
  -- protecting the database from pathological/abusive payloads.
  constraint prompts_prompt_text_length check (char_length(prompt_text) <= 50000)
);

comment on table public.prompts is 'User-owned AI prompts.';

-- `category_id on delete restrict` above means a category with prompts
-- cannot be deleted outright. We keep that as the safe default (no silent
-- data loss); category management UI can decide how to handle this later
-- (e.g. reassign prompts first). This is intentionally conservative per
-- spec section 49 (future scalability) rather than over-engineered now.

-- ----------------------------------------------------------------------------
-- Cross-table ownership check: category_id must belong to the same user_id.
-- A foreign key alone cannot express this, so we enforce it with a trigger.
-- This closes an authorization gap where a user could otherwise attach
-- their prompt to another user's category id (an IDOR-style issue).
-- ----------------------------------------------------------------------------
create or replace function public.check_prompt_category_ownership()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.categories c
    where c.id = new.category_id
      and c.user_id = new.user_id
  ) then
    raise exception 'category_id must reference a category owned by the same user'
      using errcode = '23514'; -- check_violation
  end if;
  return new;
end;
$$;

create trigger prompts_check_category_ownership
  before insert or update on public.prompts
  for each row
  execute function public.check_prompt_category_ownership();

-- Keep updated_at current automatically.
create trigger prompts_set_updated_at
  before update on public.prompts
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Full-text search
-- ----------------------------------------------------------------------------
-- Generated tsvector column covering title (higher weight) and prompt_text
-- (lower weight), used for the dashboard search box (spec section 11/21).
-- Stored (not virtual) so it can be indexed with GIN.
alter table public.prompts
  add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(prompt_text, '')), 'B')
  ) stored;

create index prompts_search_vector_idx
  on public.prompts using gin (search_vector);

-- ----------------------------------------------------------------------------
-- Indexes supporting realistic query patterns (spec section 20)
-- ----------------------------------------------------------------------------

-- Main dashboard query: "my prompts, newest first" and its paginated variants.
create index prompts_user_id_created_at_idx
  on public.prompts (user_id, created_at desc);

-- Category filter combined with ownership + sort ("my prompts in category X,
-- newest first").
create index prompts_user_id_category_id_created_at_idx
  on public.prompts (user_id, category_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.prompts enable row level security;
alter table public.prompts force row level security;

create policy "prompts_select_own"
  on public.prompts
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "prompts_insert_own"
  on public.prompts
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "prompts_update_own"
  on public.prompts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "prompts_delete_own"
  on public.prompts
  for delete
  to authenticated
  using (user_id = auth.uid());
