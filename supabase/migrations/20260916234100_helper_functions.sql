-- ============================================================================
-- Helper functions shared across tables
-- ============================================================================

-- Generic trigger function that keeps `updated_at` current on every UPDATE.
-- Reused by categories and prompts. SECURITY: runs as the invoking role,
-- reads/writes nothing outside the row being updated.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at = now() on row update. Attached as a BEFORE UPDATE trigger.';
