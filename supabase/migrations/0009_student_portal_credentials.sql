-- Student local portal credentials are server-side fields; never expose this column through public client code.
alter table public.students
  add column if not exists password text;

create unique index if not exists students_admission_number_unique_idx
  on public.students(admission_number)
  where admission_number is not null;
