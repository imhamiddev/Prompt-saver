-- Supabase grants broad DML privileges on public/storage tables to the
-- `authenticated` role by default and relies on RLS policies to actually
-- restrict access. Mirror that here for local testing.
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.prompts to authenticated;
grant select, insert, update, delete on public.prompt_images to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
grant select on storage.buckets to authenticated;
