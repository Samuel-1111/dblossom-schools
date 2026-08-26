import fs from "node:fs";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Supabase server configuration is incomplete");
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const enc = (value) => encodeURIComponent(String(value));

function parseCsv(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) { const ch = text[i]; if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; } else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; } else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && text[i + 1] === "\n") i += 1; row.push(cell.trim()); rows.push(row); row = []; cell = ""; } else cell += ch; }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some(Boolean));
  return data.map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])));
}
async function request(path, options = {}) { const response = await fetch(`${base}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers ?? {}) } }); const text = await response.text(); let body = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; } if (!response.ok) throw new Error(`${response.status}: ${typeof body === "string" ? body : body?.message ?? JSON.stringify(body)}`); return body; }
const rows = parseCsv(fs.readFileSync("/home/ubuntu/upload/students(1).csv", "utf8"));
const [classes, students] = await Promise.all([request("classes?select=id,name&order=name"), request("students?select=id,admission_number,full_name,class_id&limit=1000")]);
const classMap = new Map(classes.map((item) => [normalize(item.name), item]));
const studentMap = new Map(); for (const item of students) { const list = studentMap.get(normalize(item.admission_number)) ?? []; list.push(item); studentMap.set(normalize(item.admission_number), list); }
const report = { csvRows: rows.length, matched: 0, updated: 0, unchanged: 0, duplicateCsvRows: 0, failed: [], missingClasses: [], missingStudents: [], classes: {} };
const seen = new Set();
for (const [index, row] of rows.entries()) {
  const identifier = String(row["Admission Number"] ?? "").trim(); const className = String(row.Class ?? "").trim(); const classRow = classMap.get(normalize(className));
  if (!classRow) { report.missingClasses.push({ row: index + 2, class: className || "(blank)", identifier }); continue; }
  report.classes[classRow.name] = (report.classes[classRow.name] ?? 0) + 1;
  const candidates = studentMap.get(normalize(identifier)) ?? [];
  const student = candidates[0];
  if (!student) { report.missingStudents.push({ row: index + 2, identifier, name: String(row["Full Name"] ?? "").trim() }); continue; }
  report.matched += 1;
  const keyId = `${student.id}:${classRow.id}`;
  if (seen.has(keyId)) { report.duplicateCsvRows += 1; continue; }
  seen.add(keyId);
  if (student.class_id === classRow.id) { report.unchanged += 1; continue; }
  try { await request(`students?id=eq.${enc(student.id)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ class_id: classRow.id }) }); report.updated += 1; }
  catch (error) { report.failed.push({ row: index + 2, identifier, class: className, reason: error.message }); }
}
console.log(JSON.stringify(report, null, 2));
