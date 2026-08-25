import fs from "node:fs";

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Supabase server configuration is incomplete");

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell.trim()); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell.trim()); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some(Boolean));
  return data.map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])));
}

const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const clean = (value) => { const v = String(value ?? "").trim(); return v || null; };
const enc = (value) => encodeURIComponent(String(value));

async function request(path, options = {}) {
  const response = await fetch(`${base}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${response.status}: ${typeof body === "string" ? body : body?.message ?? JSON.stringify(body)}`);
  return body;
}

async function findOne(table, column, value) {
  const rows = await request(`${table}?select=*&${column}=eq.${enc(value)}&limit=1`);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function save(table, existing, payload) {
  if (existing?.id) {
    const rows = await request(`${table}?id=eq.${enc(existing.id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
    return rows?.[0] ?? existing;
  }
  const rows = await request(table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
  return rows?.[0] ?? null;
}

const studentRows = parseCsv(fs.readFileSync("/home/ubuntu/upload/students.csv", "utf8"));
const teacherRows = parseCsv(fs.readFileSync("/home/ubuntu/upload/teachers.csv", "utf8"));
const classes = await request("classes?select=id,name,is_active&order=name");
const classByName = new Map(classes.map((item) => [normalize(item.name), item]));
const report = { studentHeaders: Object.keys(studentRows[0] ?? {}), teacherHeaders: Object.keys(teacherRows[0] ?? {}), students: { inserted: 0, updated: 0, failed: [] }, teachers: { inserted: 0, updated: 0, failed: [] }, unmappedClasses: new Set() };

for (const [index, row] of studentRows.entries()) {
  try {
    const classRow = classByName.get(normalize(row.Class));
    if (!classRow) { report.unmappedClasses.add(row.Class || "(blank)"); throw new Error(`Class not found: ${row.Class || "(blank)"}`); }
    const existing = await findOne("students", "admission_number", row["Admission Number"]);
    const payload = {
      admission_number: row["Admission Number"].trim(),
      full_name: row["Full Name"].trim(),
      class_id: classRow.id,
      date_of_birth: clean(row["Date of Birth"]),
      guardian_name: clean(row["Parent Name"]),
      guardian_contact: clean(row["Parent Phone"]),
      status: (row.Status || "Active").trim().toLowerCase(),
    };
    await save("students", existing, payload);
    if (existing) report.students.updated += 1; else report.students.inserted += 1;
  } catch (error) {
    report.students.failed.push({ row: index + 2, identifier: row["Admission Number"] || null, reason: error.message });
  }
}

for (const [index, row] of teacherRows.entries()) {
  try {
    const staffId = row["Staff ID"].trim();
    const existing = await findOne("teachers", "staff_id", staffId) ?? await findOne("teachers", "email", row.Email.trim());
    const payload = {
      full_name: row["Full Name"].trim(),
      staff_id: staffId,
      email: clean(row.Email),
      phone: clean(row.Phone),
      subject: clean(row.Subject),
      role: clean(row.Role) ?? "Teaching Staff",
      assigned_class: clean(row["Assigned Class"]),
      password: row.Password,
      status: (row.Status || "Active").trim().toLowerCase(),
    };
    await save("teachers", existing, payload);
    if (existing) report.teachers.updated += 1; else report.teachers.inserted += 1;
  } catch (error) {
    report.teachers.failed.push({ row: index + 2, identifier: row["Staff ID"] || null, reason: error.message });
  }
}

report.unmappedClasses = [...report.unmappedClasses];
console.log(JSON.stringify(report, null, 2));
