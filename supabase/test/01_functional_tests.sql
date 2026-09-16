-- ============================================================================
-- Functional tests for schema constraints + RLS. Run as postgres superuser
-- but switch `role` to `authenticated` and set test.current_user_id to
-- simulate being logged in as a specific user, matching how PostgREST/
-- Supabase evaluates RLS policies per request.
-- ============================================================================
\set ON_ERROR_STOP off
\pset pager off

\echo '--- Setup: two users ---'
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

-- Run remaining setup as postgres (bypasses RLS) so we can seed baseline data.
set role postgres;

insert into public.categories (id, user_id, name) values
  ('a1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Writing'),
  ('b1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Coding');

\echo '--- TEST 1: duplicate category name (case-insensitive) for same user should FAIL ---'
insert into public.categories (user_id, name)
  values ('11111111-1111-1111-1111-111111111111', 'writing');
-- expect: ERROR duplicate key value violates unique constraint

\echo '--- TEST 2: same category name for a DIFFERENT user should SUCCEED ---'
insert into public.categories (user_id, name)
  values ('22222222-2222-2222-2222-222222222222', 'Writing');
-- expect: INSERT 0 1

\echo '--- TEST 3: create a prompt for alice, using her own category (should SUCCEED) ---'
insert into public.prompts (id, user_id, category_id, title, prompt_text)
  values (
    'c1000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'a1000000-0000-0000-0000-000000000001',
    'Professional English Email Writer',
    'You are an assistant that rewrites emails to sound professional...'
  );
-- expect: INSERT 0 1

\echo '--- TEST 4: create a prompt for alice using BOBs category (should FAIL, ownership trigger) ---'
insert into public.prompts (user_id, category_id, title, prompt_text)
  values (
    '11111111-1111-1111-1111-111111111111',
    'b1000000-0000-0000-0000-000000000001',
    'Cross owner attempt',
    'this should not be allowed'
  );
-- expect: ERROR category_id must reference a category owned by the same user

\echo '--- TEST 5: insert 5 images for the prompt (should SUCCEED) ---'
insert into public.prompt_images (prompt_id, user_id, storage_path, display_order) values
  ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/c1000000-0000-0000-0000-000000000001/1.png', 0),
  ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/c1000000-0000-0000-0000-000000000001/2.png', 1),
  ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/c1000000-0000-0000-0000-000000000001/3.png', 2),
  ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/c1000000-0000-0000-0000-000000000001/4.png', 3),
  ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/c1000000-0000-0000-0000-000000000001/5.png', 4);
-- expect: INSERT 0 5

\echo '--- TEST 6: insert a 6th image for the SAME prompt (should FAIL, max 5) ---'
insert into public.prompt_images (prompt_id, user_id, storage_path, display_order)
  values ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111/c1000000-0000-0000-0000-000000000001/6.png', 0);
-- Note: display_order 0 is already taken too, but ordering of errors doesn't
-- matter here -- we expect it to fail one way or another.
-- expect: ERROR a prompt may have at most 5 images (or unique violation on display_order)

\echo '--- TEST 7: insert image with user_id that does not match the prompt owner (should FAIL) ---'
insert into public.prompt_images (prompt_id, user_id, storage_path, display_order)
  values ('c1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222/c1000000-0000-0000-0000-000000000001/x.png', 0);
-- expect: ERROR (either count check or user_id mismatch check)

\echo '=== Now testing RLS as actual authenticated users ==='

\echo '--- TEST 8: as Alice, select prompts -> should see only her own prompt ---'
set role authenticated;
set local "request.jwt.claims" to '{}'; -- not used by our stub, but mirrors real setup
select set_config('test.current_user_id', '11111111-1111-1111-1111-111111111111', false);
select id, title from public.prompts;
-- expect: exactly 1 row (Professional English Email Writer)

\echo '--- TEST 9: as Alice, try to select Bob category directly by id -> should return 0 rows ---'
select id, name from public.categories where id = 'b1000000-0000-0000-0000-000000000001';
-- expect: 0 rows (RLS hides it, not an error)

\echo '--- TEST 10: as Alice, try to delete Bob''s category -> should delete 0 rows ---'
delete from public.categories where id = 'b1000000-0000-0000-0000-000000000001';
-- expect: DELETE 0

\echo '--- TEST 11: as Alice, try to insert a category row with someone else''s user_id -> should FAIL (RLS insert check) ---'
insert into public.categories (user_id, name) values ('22222222-2222-2222-2222-222222222222', 'Malicious');
-- expect: ERROR new row violates row-level security policy

\echo '--- TEST 12: as Alice, try to update her own prompt title -> should SUCCEED ---'
update public.prompts set title = 'Updated title' where id = 'c1000000-0000-0000-0000-000000000001';
select title from public.prompts where id = 'c1000000-0000-0000-0000-000000000001';
-- expect: UPDATE 1, title = 'Updated title'

\echo '--- TEST 13: switch to Bob, try to update Alice''s prompt -> should update 0 rows ---'
select set_config('test.current_user_id', '22222222-2222-2222-2222-222222222222', false);
update public.prompts set title = 'Hacked by bob' where id = 'c1000000-0000-0000-0000-000000000001';
-- expect: UPDATE 0

\echo '--- TEST 14: Bob selects prompt_images -> should see 0 rows (all images belong to alice) ---'
select count(*) from public.prompt_images;
-- expect: count = 0

\echo '--- TEST 15: Storage RLS - Alice can insert an object under her own folder ---'
select set_config('test.current_user_id', '11111111-1111-1111-1111-111111111111', false);
insert into storage.objects (bucket_id, name, owner) values (
  'prompt-images',
  '11111111-1111-1111-1111-111111111111/c1000000-0000-0000-0000-000000000001/1.png',
  '11111111-1111-1111-1111-111111111111'
);
-- expect: INSERT 0 1

\echo '--- TEST 16: Storage RLS - Alice CANNOT insert an object under Bob''s folder ---'
insert into storage.objects (bucket_id, name, owner) values (
  'prompt-images',
  '22222222-2222-2222-2222-222222222222/some-prompt/evil.png',
  '11111111-1111-1111-1111-111111111111'
);
-- expect: ERROR new row violates row-level security policy

\echo '--- TEST 17: Storage RLS - Bob cannot SELECT Alice''s object ---'
select set_config('test.current_user_id', '22222222-2222-2222-2222-222222222222', false);
select count(*) from storage.objects where bucket_id = 'prompt-images';
-- expect: count = 0 (Alice's row invisible to Bob)

\echo '=== Done ==='
reset role;
