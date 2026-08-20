create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'teacher', false);
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_profile_role() = 'student', false);
$$;

drop policy if exists attendance_teacher_class on public.attendance;
create policy attendance_teacher_class on public.attendance for all
using (
  public.is_teacher() and exists (
    select 1 from public.students s
    join public.classes c on c.id = s.class_id
    where s.id = attendance.student_id and c.teacher_id = auth.uid()
  )
)
with check (public.is_teacher() and recorded_by = auth.uid());

drop policy if exists grades_teacher_class on public.grades;
create policy grades_teacher_class on public.grades for all
using (
  public.is_teacher() and exists (
    select 1 from public.students s
    join public.classes c on c.id = s.class_id
    join public.subjects sub on sub.id = grades.subject_id and sub.class_id = c.id
    where s.id = grades.student_id and c.teacher_id = auth.uid()
  )
)
with check (public.is_teacher() and recorded_by = auth.uid());

drop policy if exists results_teacher_assigned_class on public.results;
create policy results_teacher_assigned_class on public.results for all
using (
  public.is_teacher() and exists (
    select 1 from public.students s
    join public.classes c on c.id = s.class_id
    where s.id = results.student_id and c.teacher_id = auth.uid()
  )
)
with check (public.is_teacher() and recorded_by = auth.uid());

drop policy if exists results_admin_all on public.results;
create policy results_admin_all on public.results for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists results_student_read on public.results;
create policy results_student_read on public.results for select using (
  public.is_student() and exists (
    select 1 from public.students s where s.id = results.student_id and s.profile_id = auth.uid()
  )
);

drop policy if exists announcements_authenticated_read on public.announcements;
create policy announcements_authenticated_read on public.announcements for select using (
  auth.uid() is not null and (
    class_id is null or exists (
      select 1 from public.students s where s.class_id = announcements.class_id and s.profile_id = auth.uid()
    ) or exists (
      select 1 from public.classes c where c.id = announcements.class_id and c.teacher_id = auth.uid()
    )
  )
);

create unique index if not exists attendance_student_date_unique on public.attendance(student_id, date);
create index if not exists portal_credentials_type_identifier_idx on public.portal_credentials(credential_type, login_identifier);
