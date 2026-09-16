-- ============================================================================
-- Storage: prompt-images bucket + ownership-based policies
-- ============================================================================
-- Path convention (spec section 30):
--   prompt-images/<user_id>/<prompt_id>/<filename>
--
-- The bucket is PRIVATE. Images are never served via a public URL; the app
-- creates short-lived signed URLs on the server for a user's own images
-- (spec section 9: "prefer private Supabase Storage buckets with controlled
-- access"). RLS-style Storage policies below are a second, independent
-- enforcement layer beneath that: even if a signed URL were bypassed, a
-- direct table/API access to storage.objects for another user's file
-- would still be rejected by Postgres itself.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prompt-images',
  'prompt-images',
  false, -- private bucket
  5242880, -- 5 MB per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- storage.objects already has RLS enabled by Supabase by default; policies
-- below scope access to the "prompt-images" bucket only, and require that
-- the first path segment (the folder name) equals the caller's own user id.
--
-- storage.foldername(name) splits the object key on "/" and returns the
-- folder segments as a text[]. For key "<user_id>/<prompt_id>/<file>",
-- foldername(name)[1] is "<user_id>".

create policy "prompt_images_storage_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'prompt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "prompt_images_storage_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'prompt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "prompt_images_storage_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'prompt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'prompt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "prompt_images_storage_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'prompt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
