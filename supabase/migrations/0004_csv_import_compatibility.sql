alter table public.students
  add column if not exists gender text,
  add column if not exists parent_name text,
  add column if not exists parent_phone text,
  add column if not exists parent_email text,
  add column if not exists boarding_status text,
  add column if not exists password text;

alter table public.teachers
  add column if not exists staff_id text,
  add column if not exists subject text,
  add column if not exists role text default 'Teaching Staff',
  add column if not exists assigned_class text,
  add column if not exists password text;

create unique index if not exists teachers_staff_id_unique_idx
  on public.teachers(staff_id)
  where staff_id is not null;

alter table public.results
  add column if not exists student_name text,
  add column if not exists class_name text,
  add column if not exists session text,
  add column if not exists subject_name text,
  add column if not exists result_total numeric,
  add column if not exists average numeric,
  add column if not exists overall_percentage numeric,
  add column if not exists position text;
