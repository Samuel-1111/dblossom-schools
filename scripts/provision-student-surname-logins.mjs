import fs from "node:fs";
const csvPath = fs.existsSync("/home/ubuntu/upload/students.csv") ? "/home/ubuntu/upload/students.csv" : "/home/ubuntu/upload/students(1).csv";
function parseCsv(text) { const rows=[]; let row=[],cell="",q=false; for(let i=0;i<text.length;i++){const c=text[i]; if(c==='"'){if(q&&text[i+1]==='"'){cell+='"';i++;}else q=!q;}else if(c===','&&!q){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell.trim());rows.push(row);}const [h,...d]=rows.filter(x=>x.some(Boolean));return d.map(v=>Object.fromEntries(h.map((k,i)=>[k,v[i]??'']))); }
const firstName = (name) => String(name ?? "").trim().split(/\s+/).filter(Boolean)[0] ?? "";
const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const unique = new Map();
for (const row of rows) { const id=String(row["Admission Number"]??"").trim(); const name=String(row["Full Name"]??"").trim(); if(id && name && !unique.has(id)) unique.set(id,{id,name,password:firstName(name)}); }
const endpoint = process.env.PORTAL_LOGIN_URL || "http://127.0.0.1:3000/api/portal-login";
const report = { csvPath, csvRows: rows.length, uniqueStudents: unique.size, success: 0, notFound: 0, invalid: 0, unavailable: 0, failed: [] };
for (const student of unique.values()) {
  try { const response = await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:"student",identifier:student.id,password:student.password})}); const body=await response.json().catch(()=>({})); if(response.ok) report.success++; else if(response.status===404) report.notFound++; else if(response.status===401) report.invalid++; else if(response.status===503) report.unavailable++; else report.failed.push({identifier:student.id,status:response.status,error:body.error??"Unknown error"}); }
  catch (error) { report.failed.push({identifier:student.id,status:"request-error",error:error.message}); }
}
console.log(JSON.stringify(report,null,2));
