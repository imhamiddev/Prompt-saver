-- ============================================================================
-- Minimal stand-in for the parts of Supabase's platform schema that our
-- migrations depend on: auth.users, auth.uid(), the "authenticated" role,
-- and a bare-bones storage.objects/buckets with storage.foldername().
-- This is ONLY for local testing of our migrations; the real Supabase
-- project already provides all of this.
-- ============================================================================

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

-- In real Supabase, auth.uid() reads the JWT claim of the current request.
-- Locally we fake it via a session-local setting we set before each test.
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(current_setting('test.current_user_id', true), '')::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
end $$;

grant usage on schema public to authenticated, anon;
grant usage on schema auth to authenticated, anon;
grant usage on schema storage to authenticated, anon;

-- Supabase grants broad table privileges to authenticated/anon by default
-- and relies on RLS policies (not schema-level GRANTs) to restrict access.
-- Mirror that here so our tests exercise the RLS policies themselves rather
-- than being blocked earlier by a missing GRANT.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- Minimal storage.buckets / storage.objects, matching the shape our
-- migration relies on (id, name, public, file_size_limit,
-- allowed_mime_types / bucket_id, name).
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(name text)
returns text[]
language sql immutable
as $$
  select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1];
$$;

grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
