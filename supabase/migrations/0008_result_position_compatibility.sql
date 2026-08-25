-- Add optional report-card position metadata without changing existing result rows.
alter table if exists public.results
  add column if not exists position integer;

create index if not exists results_student_position_idx
  on public.results(student_id, position)
  where position is not null;

