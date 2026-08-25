import fs from "node:fs";

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) { if (ch === "\r" && text[i + 1] === "\n") i += 1; row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.some(Boolean));
  return data.map((values) => Object.fromEntries(header.map((name, index) => [name, values[index] ?? ""])));
}

const files = {
  student: parseCsv(fs.readFileSync("/home/ubuntu/upload/students.csv", "utf8"))[0],
  teacher: parseCsv(fs.readFileSync("/home/ubuntu/upload/teachers.csv", "utf8"))[0],
};
const cases = [
  { role: "student", identifier: files.student["Admission Number"], password: files.student.Password },
  { role: "teacher", identifier: files.teacher["Staff ID"], password: files.teacher.Password },
];
for (const item of cases) {
  const response = await fetch("http://127.0.0.1:3000/api/portal-login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(item) });
  const body = await response.json().catch(() => ({}));
  console.log(JSON.stringify({ role: item.role, status: response.status, resolverAccepted: Boolean(body.login_email), error: body.error ?? null }));
}
