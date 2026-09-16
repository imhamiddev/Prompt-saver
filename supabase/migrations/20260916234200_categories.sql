-- ============================================================================
-- categories
-- ============================================================================
-- Each category belongs to exactly one user. Category names must be unique
-- per user (case-insensitive) to avoid duplicate categories like
-- "Writing" and "writing" for the same person (spec section 7).

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_name_not_blank check (btrim(name) <> ''),
  constraint categories_name_length check (char_length(name) <= 100)
);

comment on table public.categories is 'User-owned categories used to organize prompts.';

-- Case-insensitive uniqueness per user: prevents "Writing" and "writing"
-- from both existing for the same user.
create unique index categories_user_id_name_lower_key
  on public.categories (user_id, lower(name));

-- Supports "list my categories" ordered by name, and ownership checks.
create index categories_user_id_idx
  on public.categories (user_id);

-- Keep updated_at current automatically.
create trigger categories_set_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.categories enable row level security;
-- Belt-and-suspenders: force RLS even for the table owner role.
alter table public.categories force row level security;

-- Users may only see their own categories.
create policy "categories_select_own"
  on public.categories
  for select
  to authenticated
  using (user_id = auth.uid());

-- Users may only create categories for themselves (prevents mass assignment
-- of an arbitrary user_id from the client).
create policy "categories_insert_own"
  on public.categories
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Users may only update their own categories, and may not reassign
-- ownership to someone else.
create policy "categories_update_own"
  on public.categories
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users may only delete their own categories.
create policy "categories_delete_own"
  on public.categories
  for delete
  to authenticated
  using (user_id = auth.uid());
