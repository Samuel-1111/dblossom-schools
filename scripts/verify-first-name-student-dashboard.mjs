import fs from "node:fs";

function parseCsv(text) { const rows=[]; let row=[],cell="",q=false; for(let i=0;i<text.length;i++){const c=text[i]; if(c==='"'){if(q&&text[i+1]==='"'){cell+='"';i++;}else q=!q;}else if(c===","&&!q){row.push(cell.trim());cell="";}else if((c==="\n"||c==="\r")&&!q){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell.trim());rows.push(row);row=[];cell="";}else cell+=c;}if(cell||row.length){row.push(cell.trim());rows.push(row);}const [h,...d]=rows.filter(x=>x.some(Boolean));return d.map(v=>Object.fromEntries(h.map((k,i)=>[k,v[i]??""]))); }
const file = fs.existsSync("/home/ubuntu/upload/students.csv") ? "/home/ubuntu/upload/students.csv" : "/home/ubuntu/upload/students(1).csv";
const row = parseCsv(fs.readFileSync(file, "utf8")).find((item) => item["Admission Number"] && item["Full Name"]);
if (!row) throw new Error("No student row is available for the smoke test");
const firstName = String(row["Full Name"]).trim().split(/\s+/)[0];
const login = await fetch("http://127.0.0.1:3000/api/portal-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "student", identifier: String(row["Admission Number"]).trim(), password: firstName }) });
const cookie = login.headers.get("set-cookie");
const dashboard = cookie ? await fetch("http://127.0.0.1:3000/student-dashboard", { headers: { Cookie: cookie.split(";")[0] }, redirect: "manual" }) : null;
console.log(JSON.stringify({ loginStatus: login.status, localSessionCookie: Boolean(cookie?.includes("local_student_session")), dashboardStatus: dashboard?.status ?? null, dashboardOpened: Boolean(dashboard && dashboard.status === 200) }));
