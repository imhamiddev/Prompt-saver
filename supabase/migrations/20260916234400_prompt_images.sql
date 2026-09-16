-- ============================================================================
-- prompt_images
-- ============================================================================
-- Metadata/reference rows only. Actual image bytes live in Supabase Storage
-- (bucket "prompt-images"); this table stores the storage path plus display
-- order (spec section 6). user_id is denormalized from prompts.user_id so
-- RLS policies here don't need a join, and so Storage policies (which can
-- only see storage.objects, not this table directly in the simplest form)
-- stay consistent with a single source of truth for ownership.

create table public.prompt_images (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  display_order smallint not null default 0,
  created_at timestamptz not null default now(),

  constraint prompt_images_display_order_range check (display_order between 0 and 4),
  constraint prompt_images_storage_path_not_blank check (btrim(storage_path) <> ''),
  -- One storage object should not be referenced by two rows.
  constraint prompt_images_storage_path_key unique (storage_path)
);

comment on table public.prompt_images is
  'Metadata for images attached to a prompt. Image bytes live in Supabase Storage.';

-- A given prompt cannot have two images in the same display slot; this also
-- gives us an easy conflict target for reordering upserts.
create unique index prompt_images_prompt_id_display_order_key
  on public.prompt_images (prompt_id, display_order);

-- Supports "load all images for this prompt, in order" (details/edit pages).
create index prompt_images_prompt_id_idx
  on public.prompt_images (prompt_id, display_order);

-- Supports ownership checks / "all images for this user" administrative
-- queries and cascade-adjacent lookups.
create index prompt_images_user_id_idx
  on public.prompt_images (user_id);

-- ----------------------------------------------------------------------------
-- Cross-table ownership check: user_id must match the parent prompt's
-- user_id, and the number of images per prompt must never exceed 5
-- (spec section 6/8/16). Enforced server-side regardless of what the
-- client sends, closing off both IDOR and mass-assignment style issues.
-- ----------------------------------------------------------------------------
create or replace function public.check_prompt_image_constraints()
returns trigger
language plpgsql
as $$
declare
  prompt_owner uuid;
  image_count integer;
begin
  select p.user_id into prompt_owner
  from public.prompts p
  where p.id = new.prompt_id;

  if prompt_owner is null then
    raise exception 'prompt_id does not reference an existing prompt'
      using errcode = '23503'; -- foreign_key_violation
  end if;

  if prompt_owner <> new.user_id then
    raise exception 'user_id must match the owning prompt''s user_id'
      using errcode = '23514'; -- check_violation
  end if;

  select count(*) into image_count
  from public.prompt_images pi
  where pi.prompt_id = new.prompt_id
    and pi.id <> new.id;

  if image_count >= 5 then
    raise exception 'a prompt may have at most 5 images'
      using errcode = '23514'; -- check_violation
  end if;

  return new;
end;
$$;

create trigger prompt_images_check_constraints
  before insert or update on public.prompt_images
  for each row
  execute function public.check_prompt_image_constraints();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.prompt_images enable row level security;
alter table public.prompt_images force row level security;

create policy "prompt_images_select_own"
  on public.prompt_images
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "prompt_images_insert_own"
  on public.prompt_images
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "prompt_images_update_own"
  on public.prompt_images
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "prompt_images_delete_own"
  on public.prompt_images
  for delete
  to authenticated
  using (user_id = auth.uid());
