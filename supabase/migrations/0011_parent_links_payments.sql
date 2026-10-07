-- 0011_parent_links_payments.sql
-- Non-destructive Supabase additions for parent/teacher linking and paid result access.
-- Run after 0010_requested_schema_reconciliation.sql.

alter table if exists public.students add column if not exists profile_id uuid;

do $$
begin
  if to_regclass('public.profiles') is not null
     and not exists (
       select 1 from pg_constraint
       where conname = 'students_profile_id_fkey'
         and conrelid = 'public.students'::regclass
     ) then
    alter table public.students
      add constraint students_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete set null;
  end if;
end
$$;

create index if not exists students_profile_id_idx on public.students(profile_id);

create table if not exists public.parent_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

create table if not exists public.parent_student_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.parent_profiles(id) on delete cascade,
  student_id bigint not null references public.students(id) on delete cascade,
  relationship text not null default 'Parent',
  created_at timestamptz not null default now(),
  unique(parent_id, student_id)
);

create table if not exists public.teacher_student_links (
  id uuid primary key default gen_random_uuid(),
  teacher_id bigint not null references public.teachers(id) on delete cascade,
  student_id bigint not null references public.students(id) on delete cascade,
  relationship text not null default 'Teacher',
  created_at timestamptz not null default now(),
  unique(teacher_id, student_id)
);

create index if not exists parent_student_links_student_idx on public.parent_student_links(student_id);
create index if not exists teacher_student_links_student_idx on public.teacher_student_links(student_id);

create table if not exists public.result_access_payments (
  id uuid primary key default gen_random_uuid(),
  student_id bigint not null references public.students(id) on delete cascade,
  reference text not null unique,
  amount_kobo integer not null default 100000 check (amount_kobo = 100000),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'initialized' check (status in ('initialized', 'success', 'failed')),
  paystack_status text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.result_access_grants (
  id uuid primary key default gen_random_uuid(),
  student_id bigint not null references public.students(id) on delete cascade,
  payment_id uuid not null unique references public.result_access_payments(id) on delete cascade,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  unique(student_id, payment_id)
);

create index if not exists result_access_payments_student_idx on public.result_access_payments(student_id, created_at desc);
create index if not exists result_access_grants_student_idx on public.result_access_grants(student_id, granted_at desc);

alter table public.parent_profiles enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.teacher_student_links enable row level security;
alter table public.result_access_payments enable row level security;
alter table public.result_access_grants enable row level security;

drop policy if exists parent_profiles_admin_all on public.parent_profiles;
create policy parent_profiles_admin_all on public.parent_profiles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists parent_student_links_admin_all on public.parent_student_links;
create policy parent_student_links_admin_all on public.parent_student_links for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists teacher_student_links_admin_all on public.teacher_student_links;
create policy teacher_student_links_admin_all on public.teacher_student_links for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists result_access_payments_admin_all on public.result_access_payments;
create policy result_access_payments_admin_all on public.result_access_payments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists result_access_grants_admin_all on public.result_access_grants;
create policy result_access_grants_admin_all on public.result_access_grants for all using (public.is_admin()) with check (public.is_admin());
