import fs from "node:fs";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Supabase server configuration is incomplete");
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const norm = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const enc = (value) => encodeURIComponent(String(value));
const number = (value) => { const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? parsed : 0; };

function parseCsv(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) { const ch = text[i]; if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; } else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; } else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && text[i + 1] === "\n") i += 1; row.push(cell.trim()); rows.push(row); row = []; cell = ""; } else cell += ch; }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some(Boolean)); return data.map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])));
}

async function request(path, options = {}) {
  const response = await fetch(`${base}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
  const text = await response.text(); let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${response.status}: ${typeof body === "string" ? body : body?.message ?? JSON.stringify(body)}`);
  return body;
}
async function findExisting(studentId, subjectId, termId) {
  const rows = await request(`results?select=id&student_id=eq.${enc(studentId)}&subject_id=eq.${enc(subjectId)}&term_id=eq.${enc(termId)}&limit=1`);
  return rows?.[0] ?? null;
}
async function save(existing, payload) {
  if (existing?.id) { const rows = await request(`results?id=eq.${enc(existing.id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) }); return { kind: "updated", row: rows?.[0] }; }
  const rows = await request("results", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) }); return { kind: "inserted", row: rows?.[0] };
}

const rows = parseCsv(fs.readFileSync("/home/ubuntu/upload/results(1).csv", "utf8"));
const [students, classes, subjects, terms, sessions] = await Promise.all([
  request("students?select=id,full_name,class_id&limit=1000"),
  request("classes?select=id,name&limit=1000"),
  request("subjects?select=id,name,class_id&limit=1000"),
  request("terms?select=id,name,session_id&limit=1000"),
  request("academic_sessions?select=id,name&limit=1000"),
]);
const classMap = new Map(classes.map((item) => [norm(item.name), item]));
const studentMap = new Map(); for (const item of students) { const list = studentMap.get(norm(item.full_name)) ?? []; list.push(item); studentMap.set(norm(item.full_name), list); }
const subjectMap = new Map(subjects.map((item) => [`${item.class_id}:${norm(item.name)}`, item]));
const sessionMap = new Map(sessions.map((item) => [norm(item.name), item]));
const termMap = new Map(terms.map((item) => [`${item.session_id}:${norm(item.name)}`, item]));
const report = { rows: rows.length, inserted: 0, updated: 0, failed: [], unmapped: { students: new Set(), classes: new Set(), subjects: new Set(), sessions: new Set(), terms: new Set() } };

for (const [index, row] of rows.entries()) {
  try {
    const classRow = classMap.get(norm(row.Class));
    if (!classRow) { report.unmapped.classes.add(row.Class || "(blank)"); throw new Error(`Class not found: ${row.Class || "(blank)"}`); }
    const student = (studentMap.get(norm(row["Student Name"])) ?? []).find((item) => item.class_id === classRow.id);
    if (!student) { report.unmapped.students.add(`${row["Student Name"]} / ${row.Class}`); throw new Error(`Student not found in class: ${row["Student Name"]} / ${row.Class}`); }
    const subject = subjectMap.get(`${classRow.id}:${norm(row.Subject)}`);
    if (!subject) { report.unmapped.subjects.add(`${row.Class} / ${row.Subject || "(blank)"}`); throw new Error(`Subject not found: ${row.Subject || "(blank)"}`); }
    const session = sessionMap.get(norm(row.Session));
    if (!session) { report.unmapped.sessions.add(row.Session || "(blank)"); throw new Error(`Session not found: ${row.Session || "(blank)"}`); }
    const term = termMap.get(`${session.id}:${norm(row.Term)}`);
    if (!term) { report.unmapped.terms.add(`${row.Session} / ${row.Term}`); throw new Error(`Term not found: ${row.Term} / ${row.Session}`); }
    const existing = await findExisting(student.id, subject.id, term.id);
    const payload = {
      student_id: student.id,
      subject_id: subject.id,
      term_id: term.id,
      ca_score: number(row["CA Score"]),
      exam_score: number(row["Exam Score"]),
      total_score: number(row.Total || row["Result Total"]),
      grade: row.Grade?.trim() || null,
      teacher_comment: row["Teacher Comment"]?.trim() || null,
      principal_comment: row["Principal Comment"]?.trim() || null,
      approved: existing ? undefined : false,
    };
    if (payload.approved === undefined) delete payload.approved;
    const saved = await save(existing, payload);
    report[saved.kind] += 1;
  } catch (error) {
    report.failed.push({ row: index + 2, student: row["Student Name"] || null, class: row.Class || null, subject: row.Subject || null, reason: error.message });
  }
}
report.unmapped = Object.fromEntries(Object.entries(report.unmapped).map(([key, values]) => [key, [...values]]));
console.log(JSON.stringify(report, null, 2));
