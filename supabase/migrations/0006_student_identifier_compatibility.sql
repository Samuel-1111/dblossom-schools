-- Standardize student credentials for legacy and fresh Supabase deployments.
-- Keep student_number when it exists so older imports and screens remain readable.
alter table public.students
  add column if not exists admission_number text,
  add column if not exists full_name text,
  add column if not exists password text,
  add column if not exists profile_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'students'
      and column_name = 'student_number'
  ) then
    execute $migration$
      update public.students
      set admission_number = student_number
      where admission_number is null
        and student_number is not null
    $migration$;
    execute 'alter table public.students alter column student_number drop not null';
    execute $migration$
      update public.students
      set student_number = admission_number
      where student_number is null
        and admission_number is not null
    $migration$;
  end if;
end
$$;

create unique index if not exists students_admission_number_unique_idx
  on public.students(admission_number)
  where admission_number is not null;

-- Add the profile foreign key when the profiles table is available, without
-- preventing this compatibility migration from running against a legacy DB.
do $$
begin
  if to_regclass('public.profiles') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'students_profile_id_fkey'
         and conrelid = 'public.students'::regclass
     ) then
    alter table public.students
      add constraint students_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete set null;
  end if;
end
$$;
