-- Requested schema reconciliation for existing Supabase projects.
-- Safe to run after 0001-0009; all additions are idempotent.

alter table if exists public.students
  add column if not exists boarding_status text not null default 'Day',
  add column if not exists password text;

alter table if exists public.subjects
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  subject text not null,
  message text not null,
  status text not null default 'New',
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  alt_text text,
  image_url text not null,
  category text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  event_date date not null default current_date,
  category text,
  status text not null default 'Published',
  image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.complaints enable row level security;
alter table public.gallery_images enable row level security;
alter table public.events enable row level security;

drop policy if exists complaints_public_insert on public.complaints;
create policy complaints_public_insert on public.complaints for insert with check (true);
drop policy if exists complaints_admin_all on public.complaints;
create policy complaints_admin_all on public.complaints for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists gallery_public_read on public.gallery_images;
create policy gallery_public_read on public.gallery_images for select using (true);
drop policy if exists gallery_admin_write on public.gallery_images;
create policy gallery_admin_write on public.gallery_images for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events for select using (true);
drop policy if exists events_admin_write on public.events;
create policy events_admin_write on public.events for all using (public.is_admin()) with check (public.is_admin());

create index if not exists complaints_status_idx on public.complaints(status);
create index if not exists events_date_idx on public.events(event_date);
