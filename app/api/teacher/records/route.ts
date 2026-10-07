import { NextResponse } from "next/server";
import { createClient } from "../../../../utils/supabase/server";
import { createServiceClient } from "../../../../utils/supabase/service";

export const dynamic = "force-dynamic";

type Row = Record<string, any>;
type ScoreInput = { ca: string; exam: string };

type TeacherContext = {
  user: { id: string; email?: string | null; user_metadata?: Record<string, any> | null };
  teacher: Row | null;
  classes: Row[];
  supabase: ReturnType<typeof createServiceClient>;
};

function normalizeClassName(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function configuredClassNames(value: unknown) {
  return String(value ?? "").split(/[,;|]/).map(normalizeClassName).filter(Boolean);
}

async function resolveTeacher(): Promise<{ context: TeacherContext } | { response: NextResponse }> {
  const authClient = await createClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return { response: NextResponse.json({ error: "Teacher session required" }, { status: 401 }) };

  const supabase = createServiceClient();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "teacher") return { response: NextResponse.json({ error: "Teacher access required" }, { status: 403 }) };

  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("id, full_name, role, assigned_class, profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (teacherError) return { response: NextResponse.json({ error: "Teacher account could not be loaded." }, { status: 503 }) };
  if (!teacher) return { response: NextResponse.json({ error: "Teacher record is not linked to this account." }, { status: 403 }) };

  const { data: assignmentRows, error: assignmentError } = await supabase
    .from("teacher_assignments")
    .select("class_id, classes(id, name, grade_level, academic_year)")
    .eq("teacher_id", teacher.id);
  if (assignmentError) return { response: NextResponse.json({ error: "Teacher assignments could not be loaded." }, { status: 503 }) };

  const classes = Array.from(new Map((assignmentRows ?? []).map((row: any) => {
    const cls = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    return [String(cls?.id ?? row.class_id), cls];
  }).filter((entry: any) => entry[1]?.id)).values()).sort((a: any, b: any) => String(a.name ?? "").localeCompare(String(b.name ?? "")));

  return { context: { user, teacher, classes, supabase } };
}

function findClass(context: TeacherContext, classId: string) {
  return context.classes.find((row) => String(row.id) === classId) ?? null;
}

async function workspace(context: TeacherContext, classId: string) {
  const selectedClass = findClass(context, classId) ?? context.classes[0] ?? null;
  if (!selectedClass) return { classes: context.classes, selectedClass: null, students: [], subjects: [], results: [] };
  const [{ data: students, error: studentError }, { data: subjects, error: subjectError }] = await Promise.all([
    context.supabase.from("students").select("id, admission_number, full_name, profile_id, guardian_name, class_id").eq("class_id", selectedClass.id).order("admission_number"),
    context.supabase.from("subjects").select("id, name, class_id").eq("class_id", selectedClass.id).order("name"),
  ]);
  if (studentError) throw new Error(studentError.message);
  if (subjectError) throw new Error(subjectError.message);
  const typedStudents = (students ?? []) as Row[];
  const typedSubjects = (subjects ?? []) as Row[];
  const studentIds = typedStudents.map((row: Row) => row.id);
  const { data: resultRows } = studentIds.length
    ? await context.supabase.from("results").select("id, student_id, term_id, ca_score, exam_score, total_score, grade, teacher_comment, principal_comment, created_at").in("student_id", studentIds).order("created_at", { ascending: false }).limit(2000)
    : { data: [] as Row[] };
  const typedResultRows = (resultRows ?? []) as Row[];
  const termIds = Array.from(new Set(typedResultRows.map((row: Row) => row.term_id).filter(Boolean)));
  const { data: terms } = termIds.length ? await context.supabase.from("terms").select("id, name, session_id").in("id", termIds) : { data: [] as Row[] };
  const typedTerms = (terms ?? []) as Row[];
  const sessionIds = Array.from(new Set(typedTerms.map((row: Row) => row.session_id).filter(Boolean)));
  const { data: sessions } = sessionIds.length ? await context.supabase.from("academic_sessions").select("id, name").in("id", sessionIds) : { data: [] as Row[] };
  const typedSessions = (sessions ?? []) as Row[];
  const studentById = new Map(typedStudents.map((row: Row) => [String(row.id), row]));
  const subjectById = new Map(typedSubjects.map((row: Row) => [String(row.id), row]));
  const termById = new Map(typedTerms.map((row: Row) => [String(row.id), row]));
  const sessionById = new Map(typedSessions.map((row: Row) => [String(row.id), row]));
  const results = typedResultRows.map((row: Row) => {
    const term = termById.get(String(row.term_id));
    return { ...row, student_name: studentById.get(String(row.student_id))?.full_name ?? studentById.get(String(row.student_id))?.admission_number ?? "Student", subject_name: subjectById.get(String(row.subject_id))?.name ?? row.subject_name ?? "Subject", class_name: selectedClass.name, term: term?.name ?? "Term not recorded", session: sessionById.get(String(term?.session_id))?.name ?? "Session not recorded" };
  });
  return { classes: context.classes, selectedClass, students: typedStudents, subjects: typedSubjects, results };
}

async function resultContext(context: TeacherContext, body: Row) {
  const classId = String(body.class_id ?? "");
  const studentId = String(body.student_id ?? "");
  const selectedClass = findClass(context, classId);
  if (!selectedClass) return { error: "That class is not assigned to this teacher." };
  const { data: student } = await context.supabase.from("students").select("id, full_name, admission_number, class_id").eq("id", studentId).eq("class_id", selectedClass.id).maybeSingle();
  if (!student) return { error: "Select a student from your assigned class." };
  const sessionName = String(body.session ?? "").trim();
  const termName = String(body.term ?? "").trim();
  if (!sessionName || !termName) return { error: "Term and academic session are required." };
  const { data: session, error: sessionError } = await context.supabase.from("academic_sessions").select("id, name").eq("name", sessionName).maybeSingle();
  if (sessionError || !session) return { error: sessionError?.message ?? "Choose an academic session that exists in the school records." };
  const { data: term, error: termError } = await context.supabase.from("terms").select("id, name").eq("name", termName).eq("session_id", session.id).maybeSingle();
  if (termError || !term) return { error: termError?.message ?? "Choose a term that exists for the selected session." };
  return { selectedClass, student, session, term };
}

export async function GET(request: Request) {
  const resolved = await resolveTeacher();
  if ("response" in resolved) return resolved.response;
  const context = resolved.context;
  const classId = new URL(request.url).searchParams.get("class_id") ?? String(context.classes[0]?.id ?? "");
  try {
    return NextResponse.json({ data: await workspace(context, classId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load the Teacher workspace" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const resolved = await resolveTeacher();
  if ("response" in resolved) return resolved.response;
  const context = resolved.context;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");
  if (action === "save-result") {
    const target = await resultContext(context, body);
    if ("error" in target) return NextResponse.json({ error: target.error }, { status: 400 });
    const { data: allSubjects, error: subjectError } = await context.supabase.from("subjects").select("id, name, class_id").eq("class_id", target.selectedClass.id).order("name");
    if (subjectError) return NextResponse.json({ error: subjectError.message }, { status: 400 });
    const requestedSubjectIds = Array.isArray(body.subject_ids) ? new Set(body.subject_ids.map((value: unknown) => String(value))) : null;
    const subjects = requestedSubjectIds ? (allSubjects ?? []).filter((subject) => requestedSubjectIds.has(String(subject.id))) : (allSubjects ?? []);
    if (!subjects.length) return NextResponse.json({ error: "Keep at least one subject in the report before saving." }, { status: 400 });
    const scores = (body.subject_scores ?? {}) as Record<string, ScoreInput>;
    const failures: string[] = [];
    for (const subject of subjects) {
      const score = scores[String(subject.id)];
      const ca = Number(score?.ca);
      const exam = Number(score?.exam);
      if (!score || !Number.isFinite(ca) || !Number.isFinite(exam)) { failures.push(`${subject.name}: CA and Exam scores are required`); continue; }
      if (ca < 0 || ca > 30 || exam < 0 || exam > 70) { failures.push(`${subject.name}: CA must be 0-30 and Exam must be 0-70`); continue; }
      const total = Math.min(100, ca + exam);
      const grade = total >= 70 ? "A" : total >= 60 ? "B" : total >= 50 ? "C" : total >= 40 ? "D" : "F";
      const { data: existing } = await context.supabase.from("results").select("id").eq("student_id", target.student.id).eq("subject_id", subject.id).eq("term_id", target.term.id).maybeSingle();
      const payload = { student_id: target.student.id, subject_id: subject.id, term_id: target.term.id, ca_score: ca, exam_score: exam, total_score: total, grade, recorded_by: context.user.id };
      const result = existing?.id ? await context.supabase.from("results").update(payload).eq("id", existing.id) : await context.supabase.from("results").insert(payload);
      if (result.error) failures.push(`${subject.name}: ${result.error.message}`);
    }
    if (failures.length) return NextResponse.json({ error: `Some subject results could not be saved: ${failures.join("; ")}` }, { status: 400 });
    return NextResponse.json({ data: { message: `Complete report saved for ${target.student.full_name || target.student.admission_number}.` } });
  }
  if (action === "delete-subject") {
    const target = await resultContext(context, body);
    if ("error" in target) return NextResponse.json({ error: target.error }, { status: 400 });
    const subjectId = String(body.subject_id ?? "");
    const { data: subject } = await context.supabase.from("subjects").select("id, name").eq("id", subjectId).eq("class_id", target.selectedClass.id).maybeSingle();
    if (!subject) return NextResponse.json({ error: "That subject is not part of the assigned class." }, { status: 400 });
    const { data: deletedRows, error: deleteError } = await context.supabase.from("results").delete().eq("student_id", target.student.id).eq("subject_id", subject.id).eq("term_id", target.term.id).select("id");
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
    if (!deletedRows?.length) return NextResponse.json({ error: "No saved result exists for that subject in this report." }, { status: 404 });
    return NextResponse.json({ data: { message: `${subject.name} was removed from this report.` } });
  }
  if (action === "save-remark") {
    const target = await resultContext(context, body);
    if ("error" in target) return NextResponse.json({ error: target.error }, { status: 400 });
    const comment = String(body.teacher_comment ?? "").trim();
    if (!comment) return NextResponse.json({ error: "Enter a teacher remark before saving." }, { status: 400 });
    const { data: resultRows, error: resultError } = await context.supabase.from("results").select("id").eq("student_id", target.student.id).eq("term_id", target.term.id);
    if (resultError) return NextResponse.json({ error: resultError.message }, { status: 400 });
    if (!resultRows?.length) return NextResponse.json({ error: "No subject results exist for this student and term yet. Save the complete result first." }, { status: 400 });
    const { error } = await context.supabase.from("results").update({ teacher_comment: comment, recorded_by: context.user.id }).eq("student_id", target.student.id).eq("term_id", target.term.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: { message: `Teacher remark saved for ${target.student.full_name || target.student.admission_number}.` } });
  }
  if (action === "save-attendance") {
    const classId = String(body.class_id ?? "");
    const selectedClass = findClass(context, classId);
    const studentId = String(body.student_id ?? "");
    if (!selectedClass) return NextResponse.json({ error: "That class is not assigned to this teacher." }, { status: 400 });
    const { data: student } = await context.supabase.from("students").select("id").eq("id", studentId).eq("class_id", selectedClass.id).maybeSingle();
    if (!student) return NextResponse.json({ error: "Select a student from your assigned class." }, { status: 400 });
    const { error } = await context.supabase.from("attendance").upsert({ student_id: studentId, date: String(body.date ?? ""), status: String(body.status ?? "present"), recorded_by: context.user.id }, { onConflict: "student_id,date" });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: { message: "Attendance recorded." } });
  }
  return NextResponse.json({ error: "Unsupported Teacher action" }, { status: 400 });
}
