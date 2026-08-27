import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Supabase server configuration is incomplete");
const supabase = createClient(base, key, { auth: { autoRefreshToken: false, persistSession: false } });
const csvPath = fs.existsSync("/home/ubuntu/upload/students.csv") ? "/home/ubuntu/upload/students.csv" : "/home/ubuntu/upload/students(1).csv";

function parseCsv(text) { const rows=[]; let row=[],cell="",q=false; for(let i=0;i<text.length;i++){const c=text[i]; if(c==='"'){if(q&&text[i+1]==='"'){cell+='"';i++;}else q=!q;}else if(c===","&&!q){row.push(cell.trim());cell="";}else if((c==="\n"||c==="\r")&&!q){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell.trim());rows.push(row);row=[];cell="";}else cell+=c;}if(cell||row.length){row.push(cell.trim());rows.push(row);}const [h,...d]=rows.filter(x=>x.some(Boolean));return d.map(v=>Object.fromEntries(h.map((k,i)=>[k,v[i]??""]))); }
const normalize = (value) => String(value ?? "").trim().toLowerCase();
const loginEmail = (identifier) => `student-${normalize(identifier).replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "user"}@local.dblossom.school`;
// The uploaded CSV writes names as "Surname FirstName"; the given first-name token is the second word.
const firstName = (fullName) => { const parts = String(fullName ?? "").trim().split(/\s+/).filter(Boolean); return parts.length > 1 ? parts[1] : parts[0] ?? ""; };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const unique = new Map();
for (const row of parseCsv(fs.readFileSync(csvPath, "utf8"))) {
  const identifier = String(row["Admission Number"] ?? "").trim();
  const fullName = String(row["Full Name"] ?? "").trim();
  if (identifier && fullName && !unique.has(normalize(identifier))) unique.set(normalize(identifier), { identifier, fullName, password: firstName(fullName) });
}

const report = { csvPath, uniqueStudents: unique.size, updated: 0, linked: 0, profileLinkPending: 0, missingAuthIdentity: 0, shortFirstNameFallback: 0, failures: [] };
const users = [];
for (let page = 1; page <= 3; page += 1) { const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 }); if (error) throw error; users.push(...data.users); if (data.users.length < 1000) break; }
const userByEmail = new Map(users.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]));
let studentPasswordColumn = true;
let { data: students, error: studentError } = await supabase.from("students").select("id,admission_number,full_name,password").limit(1000);
if (studentError && /column .*password.*does not exist|schema cache/i.test(studentError.message)) {
  studentPasswordColumn = false;
  const fallback = await supabase.from("students").select("id,admission_number,full_name").limit(1000);
  students = fallback.data;
  studentError = fallback.error;
}
if (studentError) throw studentError;
const studentByAdmission = new Map((students ?? []).filter((student) => student.admission_number).map((student) => [normalize(student.admission_number), student]));

for (const row of unique.values()) {
  const user = userByEmail.get(loginEmail(row.identifier));
  const student = studentByAdmission.get(normalize(row.identifier));
  if (!user) { report.missingAuthIdentity += 1; continue; }
  const authUpdate = { user_metadata: { full_name: row.fullName, role: "student", portal_identifier: row.identifier }, ...(row.password.length >= 6 ? { password: row.password } : {}) };
  const { error } = await supabase.auth.admin.updateUserById(user.id, authUpdate);
  if (error) { report.failures.push({ identifier: row.identifier, reason: error.message }); continue; }
  report.updated += 1;
  if (row.password.length < 6) report.shortFirstNameFallback += 1;
  if (student && studentPasswordColumn) {
    const { error: passwordError } = await supabase.from("students").update({ password: row.password }).eq("id", student.id);
    if (passwordError && !/column .*password.*does not exist|schema cache/i.test(passwordError.message)) report.failures.push({ identifier: row.identifier, reason: passwordError.message });
  }
  // Profiles are optional in the portable schema; credential refresh must not fail just because that table is absent.
  const { error: profileError } = await supabase.from("profiles").upsert({ id: user.id, full_name: row.fullName, role: "student" }, { onConflict: "id" });
  if (!profileError) { if (student) report.profileLinkPending += 1; report.linked += 1; }
  else if (!/could not find the table|schema cache/i.test(profileError.message)) report.failures.push({ identifier: row.identifier, reason: profileError.message });
  await pause(45);
}

console.log(JSON.stringify(report, null, 2));
