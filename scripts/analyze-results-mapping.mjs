import fs from "node:fs";

function parseCsv(text) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) { const ch = text[i]; if (ch === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = !quoted; } else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; } else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && text[i + 1] === "\n") i += 1; row.push(cell.trim()); rows.push(row); row = []; cell = ""; } else cell += ch; }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some(Boolean)); return data.map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])));
}
const norm = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const base = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, h = { apikey: key, Authorization: `Bearer ${key}` };
async function get(path) { const r = await fetch(`${base}/rest/v1/${path}`, { headers: h }); const b = await r.json(); if (!r.ok) throw new Error(`${r.status}: ${b.message ?? JSON.stringify(b)}`); return b; }
const rows = parseCsv(fs.readFileSync("/home/ubuntu/upload/results(1).csv", "utf8"));
const [students, classes, subjects, terms, sessions] = await Promise.all([get("students?select=id,full_name,class_id&limit=1000"), get("classes?select=id,name&limit=1000"), get("subjects?select=id,name,class_id&limit=1000"), get("terms?select=id,name,session_id&limit=1000"), get("academic_sessions?select=id,name&limit=1000")]);
const classMap = new Map(classes.map((x) => [norm(x.name), x]));
const studentMap = new Map(); for (const x of students) { const k = norm(x.full_name); const list = studentMap.get(k) ?? []; list.push(x); studentMap.set(k, list); }
const subjectMap = new Map(subjects.map((x) => [`${x.class_id}:${norm(x.name)}`, x]));
const sessionMap = new Map(sessions.map((x) => [norm(x.name), x]));
const termMap = new Map(terms.map((x) => [`${x.session_id}:${norm(x.name)}`, x]));
const missing = { students: new Map(), classes: new Map(), subjects: new Map(), sessions: new Map(), terms: new Map() }; let ready = 0;
for (const [i, row] of rows.entries()) { const c = classMap.get(norm(row.Class)); const s = c ? (studentMap.get(norm(row["Student Name"])) ?? []).find((x) => x.class_id === c.id) : null; const subj = c ? subjectMap.get(`${c.id}:${norm(row.Subject)}`) : null; const ses = sessionMap.get(norm(row.Session)); const term = ses ? termMap.get(`${ses.id}:${norm(row.Term)}`) : null; if (c && s && subj && ses && term) ready++; else { for (const [key, value] of Object.entries({ students: s ? null : row["Student Name"], classes: c ? null : row.Class, subjects: subj ? null : `${row.Class} / ${row.Subject}`, sessions: ses ? null : row.Session, terms: term ? null : `${row.Session} / ${row.Term}`})) if (value) missing[key].set(value, (missing[key].get(value) ?? 0) + 1); } }
const simplify = (map) => [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,20);
console.log(JSON.stringify({rows: rows.length, ready, missing: Object.fromEntries(Object.entries(missing).map(([k,v]) => [k, simplify(v)])), referenceCounts: { students: students.length, classes: classes.length, subjects: subjects.length, sessions: sessions.length, terms: terms.length }}, null, 2));
