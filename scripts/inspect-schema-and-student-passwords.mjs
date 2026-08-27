import fs from "node:fs";
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) throw new Error("Supabase server configuration is incomplete");
const headers = { apikey: key, Authorization: `Bearer ${key}` };
async function get(path, options = {}) { const r = await fetch(`${base}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers ?? {}) } }); const text = await r.text(); let body; try { body = text ? JSON.parse(text) : null; } catch { body = text; } return { status: r.status, body, headers: r.headers }; }
function parseCsv(text) { const rows=[]; let row=[], cell="", q=false; for(let i=0;i<text.length;i++){const c=text[i]; if(c==='"'){if(q&&text[i+1]==='"'){cell+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell.trim());rows.push(row);}const [h,...d]=rows.filter(x=>x.some(Boolean));return d.map(v=>Object.fromEntries(h.map((k,i)=>[k,v[i]??'']))); }
const requested = ["students", "subjects", "complaints", "gallery_images", "events"];
const tables = {};
for (const table of requested) { const result = await get(`${table}?select=*&limit=1`); const sample = Array.isArray(result.body) ? result.body[0] ?? null : null; tables[table] = { status: result.status, columns: sample ? Object.keys(sample) : [], error: Array.isArray(result.body) ? null : result.body }; }
const csvPath = "/home/ubuntu/upload/students.csv";
const csvFallback = "/home/ubuntu/upload/students(1).csv";
const chosen = fs.existsSync(csvPath) ? csvPath : csvFallback;
const rows = parseCsv(fs.readFileSync(chosen, "utf8"));
const surname = (name) => String(name ?? "").trim().split(/\s+/).filter(Boolean).at(-1) ?? "";
const summary = { csv: chosen, rows: rows.length, headers: Object.keys(rows[0] ?? {}), classCounts: {}, passwordRows: 0, surnameDerivableRows: 0, sampleIdentifiers: rows.slice(0,3).map(r => r["Admission Number"] || null) };
for (const row of rows) { const cls = String(row.Class ?? "").trim() || "(blank)"; summary.classCounts[cls] = (summary.classCounts[cls] ?? 0) + 1; if (String(row.Password ?? "").trim()) summary.passwordRows++; if (surname(row["Full Name"])) summary.surnameDerivableRows++; }
console.log(JSON.stringify({ tables, csv: summary }, null, 2));
