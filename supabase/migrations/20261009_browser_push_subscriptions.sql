-- Browser push subscriptions for parent/teacher/admin message alerts.
-- Run once in the Divine Blossom Supabase SQL Editor.
create table if not exists public.browser_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  subscription jsonb not null,
  profile_id uuid null references auth.users(id) on delete cascade,
  role text not null check (role in ('parent','teacher','admin')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists browser_push_subscriptions_profile_enabled_idx
  on public.browser_push_subscriptions(profile_id, enabled);
create index if not exists browser_push_subscriptions_role_enabled_idx
  on public.browser_push_subscriptions(role, enabled);
alter table public.browser_push_subscriptions enable row level security;
-- No client-facing RLS policies: subscriptions are read/written only by the server service-role client.
