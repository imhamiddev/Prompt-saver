-- ============================================================================
-- prompts.is_favorite
-- ============================================================================
-- Lets a user pin/star prompts they use often, surfaced as a filter on
-- the dashboard (spec follow-up: favoriting).

alter table public.prompts
  add column is_favorite boolean not null default false;

-- Supports "my favorite prompts, newest first" - the same shape as the
-- existing prompts_user_id_created_at_idx but scoped to favorites, so a
-- user with many prompts and few favorites still gets an efficient scan
-- instead of filtering the full index.
create index prompts_user_id_favorite_created_at_idx
  on public.prompts (user_id, created_at desc)
  where is_favorite;
