import{getSupabase,getSession,signOut,esc}from"./supabase.js";

const role=document.body.dataset.role||document.querySelector("[data-role]")?.dataset.role||"student";
const loginForm=document.querySelector("#login-form");
const notice=document.querySelector("#login-notice");
const root=document.querySelector("#portal-app");
const loginView=document.querySelector("#login-view");
const dashboardView=document.querySelector("#dashboard-view");
const TERMS=["First Term","Second Term","Third Term"];
const icon=x=>({students:"🎓",teachers:"👥",results:"📄",payments:"💳",events:"📅",gallery:"🖼️",complaints:"💬",subjects:"📚",settings:"⚙️"}[x]||"•");
const toast=(message,type="info")=>{const e=document.createElement("div");e.className="toast";e.dataset.type=type;e.textContent=message;document.body.append(e);setTimeout(()=>e.remove(),3200)};
const api=async(path,options={})=>{const s=await getSession();if(!s)throw Error("Your session has expired. Please sign in again.");const r=await fetch(path,{...options,headers:{Authorization:"Bearer "+s.access_token,"content-type":"application/json",...(options.headers||{})}});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Request failed.");return data};
const setBusy=(button,busy,label)=>{if(!button)return;button.disabled=busy;button.dataset.original||=button.textContent;button.textContent=busy?label:button.dataset.original};

function showError(message){if(notice){notice.className="notice danger";notice.textContent=message}}
function clearError(){if(notice){notice.className="notice";notice.textContent=""}}

async function doLogin(e){
 e.preventDefault();clearError();const fd=new FormData(loginForm);const identifier=String(fd.get("identifier")||"").trim(),password=String(fd.get("password")||"");
 let valid=true;
 loginForm.querySelectorAll("[data-error]").forEach(x=>x.textContent="");
 if(!identifier){loginForm.querySelector("[data-error=identifier]").textContent=role==="student"?"Admission number is required":role==="teacher"?"Staff ID is required":"Username is required";valid=false}
 if(!password){loginForm.querySelector("[data-error=password]").textContent="Password is required";valid=false}
 if(!valid)return;
 const b=loginForm.querySelector("button[type=submit]");setBusy(b,true,"Logging in…");
 try{
  const sb=await getSupabase();
  if(role==="admin"){const{error}=await sb.auth.signInWithPassword({email:identifier,password});if(error)throw Error("Incorrect administrator email or password.");const{data:me}=await sb.auth.getUser();const{data:profile}=await sb.from("profiles").select("role").eq("id",me.user.id).maybeSingle();if(!profile||!["admin","super_admin"].includes(String(profile.role))){await sb.auth.signOut();throw Error("This account is not authorised for the administrator portal.")}}
  else{
   const r=await fetch("/.netlify/functions/portal-login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({role,identifier})});
   const p=await r.json().catch(()=>({}));if(!r.ok||!p.login_email)throw Error(p.error||"Portal account not found.");
   const{error}=await sb.auth.signInWithPassword({email:p.login_email,password});if(error)throw Error("Incorrect password. Please try again.");
  }
  toast("Welcome!","success");await renderDashboard();
 }catch(x){showError(x.message||"Unable to sign in right now.");toast(x.message||"Login failed","error")}
 finally{setBusy(b,false,"")}
}

async function renderDashboard(){
 const session=await getSession();
 if(!session){loginView?.classList.remove("hidden");dashboardView?.classList.add("hidden");return}
 loginView?.classList.add("hidden");dashboardView?.classList.remove("hidden");
 try{
  if(role==="admin")await renderAdmin();
  else if(role==="student")await renderStudent();
  else if(role==="teacher")await renderTeacher();
 }catch(e){dashboardView.innerHTML='<div class="dashboard-shell"><div class="notice danger">'+esc(e.message||"Dashboard could not be loaded.")+'</div></div>'}
}

function shell(title,subtitle,body,logout=true){
 return '<header class="portal-dashboard-header"><div class="container"><div class="portal-head-row"><div><h1>'+esc(title)+'</h1><p>'+esc(subtitle||"")+'</p></div>'+(logout?'<button id="logout" class="btn btn-outline-light">Logout</button>':"")+'</div></div></header><main>'+body+'</main>';
}

async function renderStudent(){
 const p=await api("/.netlify/functions/dashboard-data"),s=p.student||{},grades=p.grades||[],attendance=p.attendance||[],announcements=p.announcements||[];
 const grouped={};for(const g of grades){const k=(g.term||"Term")+"|"+(g.session||"");(grouped[k]??=[]).push(g)}
 const keys=Object.keys(grouped);
 const stats='<div class="stats"><article class="stat"><small>Student</small><strong>'+esc(s.full_name||"—")+'</strong></article><article class="stat"><small>Class</small><strong>'+esc(s.class_name||"—")+'</strong></article><article class="stat"><small>Attendance</small><strong>'+attendance.length+' records</strong></article></div>';
 let body='<div class="dashboard-shell">'+stats+'<section class="dashboard-card"><div class="section-head"><div><p class="section-label">Academic Records</p><h2>View Results</h2></div><span class="notice-inline">'+(p.hasResultAccess?"Result access active":"₦1,000 result access required")+'</span></div>';
 if(!p.hasResultAccess)body+='<div class="notice"><p>Results are protected by the school’s paid result-access system. Complete the one-time ₦1,000 payment to unlock your results.</p><button class="btn btn-gold" id="pay-results">Pay ₦1,000 to Check Results</button><p id="pay-notice"></p></div>';
 else body+='<div class="result-filters"><label class="field">Term<select id="result-term"><option value="">Select term</option>'+TERMS.map(t=>'<option>'+t+'</option>').join("")+'</select></label><label class="field">Session<input id="result-session" placeholder="e.g. 2024/2025"></label><button class="btn navy-btn" id="find-result">View Result</button></div><div id="result-output">'+(keys.length?renderResult(groupsFromKey(grouped,keys[0]),s):'<div class="notice">Select a term and session to view your report card.</div>')+'</div>';
 body+='</section><div class="dashboard-grid"><section class="dashboard-card"><h2>Attendance</h2>'+(attendance.length?attendance.slice(0,20).map(a=>'<div class="notice">'+esc(a.date)+' — <strong>'+esc(a.status)+'</strong></div>').join(""):'<p class="muted">No attendance records available.</p>')+'</section><section class="dashboard-card"><h2>Announcements</h2>'+(announcements.length?announcements.map(a=>'<article class="notice"><strong>'+esc(a.title)+'</strong><p>'+esc(a.body)+'</p></article>').join(""):'<p class="muted">No announcements yet.</p>')+'</section></div></div>';
 dashboardView.innerHTML=shell("Welcome, "+(s.full_name||"Student"),(s.class_name||"Class not assigned")+" | Admission No: "+(s.admission_number||"—"),body);
 document.querySelector("#logout")?.addEventListener("click",()=>signOut());
 document.querySelector("#find-result")?.addEventListener("click",()=>{const term=document.querySelector("#result-term").value,session=document.querySelector("#result-session").value.trim(),out=document.querySelector("#result-output");if(!term||!session){toast("Please select term and session","error");return}const rows=grouped[term+"|"+session]||[];out.innerHTML=rows.length?renderResult(rows,s):'<div class="notice">No results found for this term/session.</div>'});
 document.querySelector("#pay-results")?.addEventListener("click",startResultPayment);
}
function groupsFromKey(grouped,key){return grouped[key]||[]}
function gradeClass(g){return "pill pill-"+String(g||"F").toLowerCase()}
function renderResult(rows,s){
 const total=rows.reduce((a,x)=>a+Number(x.total_score||0),0),avg=rows.length?Math.round(total/rows.length*100)/100:0;
 const term=rows[0]?.term||"",session=rows[0]?.session||"";
 return '<div class="report-wrap" id="report-card"><div class="report-header"><img src="/manus-storage/school-logo_57ffb7b0.jpg" alt="D’Blossom logo"><div><h2>D’Blossom Model Private Schools</h2><p>Abeokuta, Ogun State, Nigeria</p><em>Building Tomorrow’s Leaders</em></div></div><div class="report-title">STUDENT ACADEMIC REPORT</div><div class="report-info"><div><small>Student Name</small><strong>'+esc(s.full_name)+'</strong></div><div><small>Admission No.</small><strong>'+esc(s.admission_number)+'</strong></div><div><small>Class</small><strong>'+esc(s.class_name||"—")+'</strong></div><div><small>Term / Session</small><strong>'+esc(term)+" / "+esc(session)+'</strong></div></div><div class="table-wrap"><table class="data-table report-table"><thead><tr><th>Subject</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(x.subject_name||"Subject")+'</td><td>'+esc(x.ca_score??"—")+'</td><td>'+esc(x.exam_score??"—")+'</td><td>'+esc(x.total_score??"0")+'</td><td><span class="'+gradeClass(x.grade)+'">'+esc(x.grade||"F")+'</span></td></tr>').join("")+'</tbody></table></div><div class="report-summary"><div><small>Total Score</small><strong>'+total+'</strong></div><div><small>Average</small><strong>'+avg+'</strong></div><div><small>Position</small><strong>—</strong></div></div><div class="report-comments"><p><b>Teacher's Comment:</b> '+esc([...new Set(rows.map(x=>x.teacher_comment).filter(Boolean))].join(" ")||"No teacher comment recorded.")+'</p><p><b>Principal's Comment:</b> '+esc([...new Set(rows.map(x=>x.principal_comment).filter(Boolean))].join(" ")||"No principal comment recorded.")+'</p></div></div><div class="report-actions"><button class="btn navy-btn" id="download-pdf">Download Result (PDF)</button></div>';
}
async function startResultPayment(){
 const b=document.querySelector("#pay-results"),n=document.querySelector("#pay-notice");setBusy(b,true,"Opening secure payment…");
 try{const s=await getSession();const r=await fetch("/.netlify/functions/paystack-init",{method:"POST",headers:{Authorization:"Bearer "+s.access_token,"x-idempotency-key":crypto.randomUUID()}});const q=await r.json();if(!r.ok)throw Error(q.error||"Payment could not be started.");location.href=q.data.authorization_url}catch(e){n.textContent=e.message;setBusy(b,false,"")}
}

async function renderTeacher(){
 const p=await api("/.netlify/functions/dashboard-data"),t=p.teacher||{},students=p.students||[],results=p.results||[];
 const isClassTeacher=String(t.role||"").toLowerCase()==="class teacher";
 let body='<div class="dashboard-shell"><div class="stats"><article class="stat"><small>Role</small><strong>'+esc(t.role||"Teaching Staff")+'</strong></article><article class="stat"><small>Assigned Class</small><strong>'+esc(t.assigned_class||"None")+'</strong></article><article class="stat"><small>Students</small><strong>'+students.length+'</strong></article></div>';
 if(!isClassTeacher)body+='<section class="dashboard-card view-only"><div class="view-only-icon">◉</div><h2>Teaching Staff — View Only</h2><p>You can view assigned school records, but result entry is restricted to Class Teachers.</p></section>';
 else{
  body+='<section class="dashboard-card"><div class="section-head"><div><p class="section-label">Class Management</p><h2>Upload / Edit Results — '+esc(t.assigned_class||"Assigned Class")+'</h2></div></div><div class="result-filters"><label class="field">Student<select id="teacher-student"><option value="">Select student</option>'+students.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.full_name)+" — "+esc(x.admission_number)+'</option>').join("")+'</select></label><label class="field">Term<select id="teacher-term"><option value="">Select term</option>'+TERMS.map(x=>'<option>'+x+'</option>').join("")+'</select></label><label class="field">Session<input id="teacher-session" placeholder="e.g. 2024/2025"></label><button class="btn navy-btn" id="load-teacher-result">Load</button></div></section><section class="dashboard-card hidden" id="score-editor"><div class="section-head"><h2>Subject Scores</h2><button class="small-btn navy-btn" id="add-subject">+ Add Subject</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Subject</th><th>CA / 30</th><th>Exam / 70</th><th>Total</th><th>Grade</th><th></th></tr></thead><tbody id="subject-rows"></tbody></table></div><div class="dashboard-grid"><label class="field">Overall Percentage<input id="overall-percentage" type="number" min="0" max="100"></label><label class="field">Teacher's Comment<textarea id="teacher-comment" rows="3" placeholder="Write your comment..."></textarea></label></div><button class="btn btn-gold" id="save-teacher-result">Save Result</button></section>';
 }
 body+='<section class="dashboard-card"><h2>Recent Results</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>Student</th><th>Term</th><th>Session</th><th>Comment</th></tr></thead><tbody>'+(results.length?results.slice(0,20).map(x=>'<tr><td>'+esc(x.student_name||"—")+'</td><td>'+esc(x.term||"—")+'</td><td>'+esc(x.session||"—")+'</td><td>'+esc(x.teacher_comment||"—")+'</td></tr>').join(""):'<tr><td colspan="4">No results recorded yet.</td></tr>')+'</tbody></table></div></section></div>';
 dashboardView.innerHTML=shell(t.full_name||"Teacher",(t.role||"Teaching Staff")+" | "+(t.assigned_class||"No class assigned"),body);
 document.querySelector("#logout")?.addEventListener("click",()=>signOut());
 if(isClassTeacher)bindTeacherEditor(students);
}
async function bindTeacherEditor(students){
 let subjects=[];let selected={student:null,term:null,session:null};let rows=[];
 const load=async()=>{const student=document.querySelector("#teacher-student").value,term=document.querySelector("#teacher-term").value,session=document.querySelector("#teacher-session").value.trim();if(!student||!term||!session){toast("Select student, term, and session","error");return}selected={student,term,session};const sb=await getSupabase();const{data,error}=await sb.from("subjects").select("id,name").order("name");if(error)throw error;subjects=data||[];const{name}=students.find(x=>x.id===student)||{};rows=subjects.map(x=>({subject_id:x.id,name:x.name,ca_score:0,exam_score:0,total:0,grade:"F"}));document.querySelector("#score-editor").classList.remove("hidden");renderSubjectRows();toast("Result grid loaded","success")};
 const renderSubjectRows=()=>{const tb=document.querySelector("#subject-rows");tb.innerHTML=rows.map((r,i)=>'<tr><td><input data-field="name" data-i="'+i+'" value="'+esc(r.name)+'"></td><td><input type="number" min="0" max="30" data-field="ca_score" data-i="'+i+'" value="'+r.ca_score+'"></td><td><input type="number" min="0" max="70" data-field="exam_score" data-i="'+i+'" value="'+r.exam_score+'"></td><td><strong>'+r.total+'</strong></td><td><span class="'+gradeClass(r.grade)+'">'+r.grade+'</span></td><td><button class="icon-btn" data-remove="'+i+'" aria-label="Delete subject">🗑</button></td></tr>').join("");tb.querySelectorAll("input").forEach(i=>i.addEventListener("input",()=>{const n=Number(i.value)||0,idx=Number(i.dataset.i),f=i.dataset.field;if(f!=="name")rows[idx][f]=Math.max(0,n);else rows[idx][f]=i.value;rows[idx].total=(Number(rows[idx].ca_score)||0)+(Number(rows[idx].exam_score)||0);rows[idx].grade=rows[idx].total>=70?"A":rows[idx].total>=60?"B":rows[idx].total>=50?"C":rows[idx].total>=40?"D":"F";renderSubjectRows()}));tb.querySelectorAll("[data-remove]").forEach(b=>b.addEventListener("click",()=>{rows.splice(Number(b.dataset.remove),1);renderSubjectRows()}))};
 document.querySelector("#load-teacher-result").addEventListener("click",()=>load().catch(e=>toast(e.message,"error")));
 document.querySelector("#add-subject").addEventListener("click",()=>{rows.push({subject_id:null,name:"",ca_score:0,exam_score:0,total:0,grade:"F"});renderSubjectRows()});
 document.querySelector("#save-teacher-result").addEventListener("click",async()=>{if(!rows.length){toast("No subjects to save","error");return}const b=document.querySelector("#save-teacher-result");setBusy(b,true,"Saving…");try{const termId=await findTermId(selected.term,selected.session);if(!termId)throw Error("The selected term/session does not exist in the school database.");for(const r of rows){if(!r.subject_id)continue;await api("/.netlify/functions/teacher-records",{method:"POST",body:JSON.stringify({action:"save-result",student_id:selected.student,subject_id:r.subject_id,term_id:termId,ca_score:r.ca_score,exam_score:r.exam_score})})}await api("/.netlify/functions/teacher-records",{method:"POST",body:JSON.stringify({action:"save-remark",student_id:selected.student,term_id:termId,teacher_comment:document.querySelector("#teacher-comment").value.trim()})});toast("Result saved successfully","success")}catch(e){toast(e.message,"error")}finally{setBusy(b,false,"")}});
}
async function findTermId(term,session){const sb=await getSupabase();const{data}=await sb.from("terms").select("id, name, academic_sessions(name)").eq("name",term);return(data||[]).find(x=>x.academic_sessions?.name===session)?.id||null}

async function renderAdmin(){
 const p=await api("/.netlify/functions/dashboard-data"),d=p.stats||{};
 const tabs=["students","teachers","results","payments","events","gallery","complaints","subjects","settings"];
 let body='<div class="admin-layout"><aside class="admin-sidebar">'+tabs.map((x,i)=>'<button class="admin-tab '+(i===0?"active":"")+'" data-admin-tab="'+x+'">'+icon(x)+'<span>'+x[0].toUpperCase()+x.slice(1)+'</span></button>').join("")+'</aside><div class="admin-content"><div id="admin-panel"></div></div><nav class="admin-bottom-nav">'+tabs.map((x,i)=>'<button class="admin-tab '+(i===0?"active":"")+'" data-admin-tab="'+x+'"><span>'+icon(x)+'</span><small>'+x[0].toUpperCase()+x.slice(1)+'</small></button>').join("")+'</nav></div>';
 dashboardView.innerHTML=shell("D’Blossom Administration","School Management System",body);
 document.querySelector("#logout")?.addEventListener("click",()=>signOut());
 document.querySelectorAll("[data-admin-tab]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll("[data-admin-tab]").forEach(x=>x.classList.toggle("active",x.dataset.adminTab===b.dataset.adminTab));renderAdminPanel(b.dataset.adminTab)}));
 await renderAdminPanel("students");
}
async function renderAdminPanel(tab){
 const panel=document.querySelector("#admin-panel");panel.innerHTML='<div class="notice">Loading '+esc(tab)+'…</div>';
 try{
  const sb=await getSupabase();
  if(tab==="students"){const{data,error}=await sb.from("students").select("id,full_name,admission_number,class_id,status,gender,date_of_birth,guardian_name,guardian_phone,guardian_email,boarding_status").order("created_at",{ascending:false}).limit(500);if(error)throw error;panel.innerHTML=adminTable("Students",["Name","Admission No.","Class","Status","Actions"],(data||[]).map(x=>[esc(x.full_name),esc(x.admission_number),esc(x.class_id||"—"),badge(x.status),'<button class="small-btn danger-btn" data-delete-table="students" data-id="'+esc(x.id)+'">Delete</button>']).map(r=>r.join("¦")));bindAdminDeletes()}
  else if(tab==="teachers"){const{data,error}=await sb.from("teachers").select("id,full_name,staff_id,role,assigned_class,status,subject,email,phone").order("created_at",{ascending:false}).limit(500);if(error)throw error;panel.innerHTML=adminTable("Teachers",["Name","Staff ID","Role","Class","Status","Actions"],(data||[]).map(x=>[esc(x.full_name),esc(x.staff_id),esc(x.role||"Teaching Staff"),esc(x.assigned_class||"—"),badge(x.status),'<button class="small-btn danger-btn" data-delete-table="teachers" data-id="'+esc(x.id)+'">Delete</button>']).map(r=>r.join("¦")));bindAdminDeletes()}
  else if(tab==="results"){const{data,error}=await sb.from("results").select("id,student_id,ca_score,exam_score,total_score,grade,teacher_comment,students(full_name,admission_number),subjects(name),terms(name,academic_sessions(name))").order("created_at",{ascending:false}).limit(500);if(error)throw error;panel.innerHTML=adminTable("Results",["Student","Term","Session","Subject","CA","Exam","Total","Grade","Actions"],(data||[]).map(x=>[esc(x.students?.full_name||"—"),esc(x.terms?.name||"—"),esc(x.terms?.academic_sessions?.name||"—"),esc(x.subjects?.name||"—"),x.ca_score,x.exam_score,x.total_score,badge(x.grade),'<button class="small-btn danger-btn" data-delete-table="results" data-id="'+esc(x.id)+'">Delete</button>']).map(r=>r.join("¦")));bindAdminDeletes()}
  else if(tab==="payments"){const{data,error}=await sb.from("payments").select("*").order("created_at",{ascending:false}).limit(500);if(error)throw error;panel.innerHTML=adminTable("Payments",["Student","Class","Amount","Date","Status","Actions"],(data||[]).map(x=>[esc(x.student_name||"—"),esc(x.class_name||"—"),"₦"+Number(x.amount||0).toLocaleString(),esc(x.payment_date||x.created_at?.slice(0,10)||"—"),badge(x.status),'<button class="small-btn" data-payment-action="Confirmed" data-id="'+esc(x.id)+'">Confirm</button> <button class="small-btn danger-btn" data-payment-action="Rejected" data-id="'+esc(x.id)+'">Reject</button>']).map(r=>r.join("¦")));bindPaymentActions()}
  else if(tab==="events"){const{data,error}=await sb.from("events").select("id,title,description,event_date,category,image_url,status").order("event_date",{ascending:false}).limit(300);if(error)throw error;panel.innerHTML=adminCards("Events",data||[],"events")}
  else if(tab==="gallery"){const{data,error}=await sb.from("gallery_images").select("id,title,category,image_url").order("created_at",{ascending:false}).limit(300);if(error)throw error;panel.innerHTML=adminCards("Gallery",data||[],"gallery")}
  else if(tab==="complaints"){const{data,error}=await sb.from("complaints").select("*").order("created_at",{ascending:false}).limit(300);if(error)throw error;panel.innerHTML='<div class="section-head"><h2>Complaints</h2></div>'+(data||[]).map(x=>'<article class="dashboard-card complaint-card"><div class="section-head"><strong>'+esc(x.name||"Unknown")+'</strong>'+badge(x.status)+'</div><p>'+esc(x.message||"")+'</p><small>'+esc(x.email||"")+' · '+esc(x.created_at?.slice(0,10)||"")+'</small></article>').join("")}
  else if(tab==="subjects"){const{data,error}=await sb.from("subjects").select("id,name").order("name");if(error)throw error;panel.innerHTML='<div class="section-head"><div><h2>Subjects</h2><p class="muted">Manage the central subject list used by result entry.</p></div></div><div class="subject-list">'+(data||[]).map(x=>'<div class="subject-row"><span>'+esc(x.name)+'</span><button class="small-btn danger-btn" data-delete-table="subjects" data-id="'+esc(x.id)+'">Delete</button></div>').join("")+'</div><form id="subject-form" class="inline-form"><input name="name" placeholder="New subject" required><button class="btn navy-btn">Add Subject</button></form>';document.querySelector("#subject-form").addEventListener("submit",async e=>{e.preventDefault();const name=new FormData(e.currentTarget).get("name").trim();try{const{error}=await sb.from("subjects").insert({name});if(error)throw error;toast("Subject added","success");renderAdminPanel("subjects")}catch(x){toast(x.message,"error")}});bindAdminDeletes()}
  else if(tab==="settings"){const p=await api("/.netlify/functions/dashboard-data"),d=p.stats||{};panel.innerHTML='<section class="dashboard-card"><h2>Settings</h2><p class="muted">Authentication and authorization are handled by Supabase. Do not store administrator passwords in localStorage.</p><button class="btn navy-btn" id="refresh-admin">Refresh dashboard data</button></section><section class="dashboard-card"><h3>Live counts</h3><div class="stats"><div class="stat"><small>Students</small><strong>'+Number(d.students||0)+'</strong></div><div class="stat"><small>Teachers</small><strong>'+Number(d.teachers||0)+'</strong></div><div class="stat"><small>Results</small><strong>'+Number(d.results||0)+'</strong></div></div></section>';document.querySelector("#refresh-admin").onclick=()=>location.reload()}
 }catch(e){panel.innerHTML='<div class="notice danger">'+esc(e.message||"This module could not be loaded.")+'</div>'}
}
function adminTable(title,headers,rows){return '<div class="section-head"><div><h2>'+title+'</h2><p class="muted">Live records from the school database.</p></div><button class="small-btn" onclick="window.print()">Print</button></div><div class="table-wrap"><table class="data-table"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join("")+'</tr></thead><tbody>'+((rows.length?rows.map(r=>'<tr>'+r.split("¦").map(c=>'<td>'+c+'</td>').join("")+'</tr>').join(""):'<tr><td colspan="'+headers.length+'">No records found.</td></tr>'))+'</tbody></table></div>'}
function badge(v){const x=String(v||"—");return '<span class="pill '+(x.toLowerCase().includes("active")||x.toLowerCase().includes("confirm")||x==="A"?"pill-a":x.toLowerCase().includes("pending")||x==="C"?"pill-c":"pill-b")+'">'+esc(x)+'</span>'}
function adminCards(title,data,type){return '<div class="section-head"><h2>'+title+'</h2></div><div class="admin-card-grid">'+data.map(x=>'<article class="dashboard-card media-card">'+(x.image_url?'<img loading="lazy" src="'+esc(x.image_url)+'" alt="">':"")+'<h3>'+esc(x.title||x.name||"Untitled")+'</h3><p>'+esc(x.description||x.category||"")+'</p><button class="small-btn danger-btn" data-delete-table="'+type+'" data-id="'+esc(x.id)+'">Delete</button></article>').join("")+'</div>'}
function bindAdminDeletes(){document.querySelectorAll("[data-delete-table]").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this record?"))return;try{const sb=await getSupabase();const{error}=await sb.from(b.dataset.deleteTable).delete().eq("id",b.dataset.id);if(error)throw error;toast("Deleted successfully","success");const active=document.querySelector("[data-admin-tab].active")?.dataset.adminTab||"students";renderAdminPanel(active)}catch(e){toast(e.message||"Delete failed","error")}})}
function bindPaymentActions(){document.querySelectorAll("[data-payment-action]").forEach(b=>b.onclick=async()=>{try{const sb=await getSupabase();const{error}=await sb.from("payments").update({status:b.dataset.paymentAction}).eq("id",b.dataset.id);if(error)throw error;toast("Payment updated","success");renderAdminPanel("payments")}catch(e){toast(e.message,"error")}})}

loginForm?.addEventListener("submit",doLogin);
document.querySelectorAll("[data-error-input]").forEach(i=>i.addEventListener("input",()=>{const e=loginForm?.querySelector("[data-error="+i.name+"]");if(e)e.textContent=""}));
renderDashboard();