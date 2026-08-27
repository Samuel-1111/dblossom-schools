import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Supabase server configuration is incomplete");
const supabase = createClient(base, key, { auth: { autoRefreshToken: false, persistSession: false } });
const csvPath = fs.existsSync("/home/ubuntu/upload/teachers.csv") ? "/home/ubuntu/upload/teachers.csv" : "/home/ubuntu/upload/teachers(1).csv";
function parseCsv(text) { const rows = []; let row = [], cell = "", quoted = false; for (let i = 0; i < text.length; i += 1) { const ch = text[i]; if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; } else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; } else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && text[i + 1] === "\n") i += 1; row.push(cell.trim()); rows.push(row); row = []; cell = ""; } else cell += ch; } if (cell.length || row.length) { row.push(cell.trim()); rows.push(row); } const [headers, ...data] = rows.filter((item) => item.some(Boolean)); return data.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))); }
const normalize = (value) => String(value ?? "").trim().toLowerCase();
const firstName = (fullName) => { const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean); return parts.length > 1 ? parts[1] : parts[0] ?? ""; };
const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const unique = new Map();
for (const row of rows) { const staffId = String(row["Staff ID"] ?? "").trim(); const fullName = String(row["Full Name"] ?? "").trim(); if (staffId && fullName && !unique.has(normalize(staffId))) unique.set(normalize(staffId), { staffId, fullName, password: firstName(fullName) }); }
const { data: teachers, error: teacherError } = await supabase.from("teachers").select("id,staff_id").limit(1000);
if (teacherError) throw teacherError;
const byStaffId = new Map((teachers ?? []).map((teacher) => [normalize(teacher.staff_id), teacher]));
const report = { csvPath, uniqueTeachers: unique.size, updated: 0, missingRecords: 0, shortFirstNameFallback: 0, failures: [] };
for (const row of unique.values()) {
  const teacher = byStaffId.get(normalize(row.staffId));
  if (!teacher) { report.missingRecords += 1; continue; }
  const { error } = await supabase.from("teachers").update({ password: row.password }).eq("id", teacher.id);
  if (error) { report.failures.push({ staffId: row.staffId, reason: error.message }); continue; }
  report.updated += 1;
  if (row.password.length < 6) report.shortFirstNameFallback += 1;
}
console.log(JSON.stringify(report, null, 2));
