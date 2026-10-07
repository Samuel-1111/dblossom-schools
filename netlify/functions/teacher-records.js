const{admin,userFrom}=require("./_supabase");
const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(body)});
exports.handler=async event=>{
 try{
  const user=await userFrom(event);if(!user)return json(401,{error:"Teacher session required."});
  const db=admin(),{data:profile}=await db.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(profile?.role!=="teacher")return json(403,{error:"Teacher access required."});
  const{data:teacher}=await db.from("teachers").select("id,role,assigned_class").eq("profile_id",user.id).maybeSingle();
  if(!teacher)return json(403,{error:"Teacher record is not linked to this account."});
  if(teacher.role!=="Class Teacher"&&event.httpMethod!=="GET")return json(403,{error:"Only Class Teachers can enter or edit results."});
  if(event.httpMethod==="GET"){
   const{data:assign}=await db.from("teacher_assignments").select("class_id,subject_id,classes(id,name,grade_level,academic_year),subjects(id,name)").eq("teacher_id",teacher.id);
   const ids=[...new Set((assign||[]).map(x=>x.class_id).filter(Boolean))];
   let students=[];
   if(ids.length){const{data}=await db.from("students").select("id,admission_number,full_name,guardian_name,class_id,classes(name)").in("class_id",ids).eq("status","active").order("full_name").limit(1000);students=data||[]}
   const subjectIds=[...new Set((assign||[]).map(x=>x.subject_id).filter(Boolean))];
   let subjects=[];
   if(subjectIds.length){const{data}=await db.from("subjects").select("id,name,class_id").in("id",subjectIds).order("name");subjects=data||[]}
   if(!subjects.length&&ids.length){const{data}=await db.from("subjects").select("id,name,class_id").in("class_id",ids).order("name");subjects=data||[]}
   const{data:terms}=await db.from("terms").select("id,name,session_id,academic_sessions(name)").order("session_id");
   const{data:results}=students.length?await db.from("results").select("id,student_id,subject_id,term_id,ca_score,exam_score,total_score,grade,teacher_comment,principal_comment,approved,subjects(name),terms(name,academic_sessions(name))").in("student_id",students.map(x=>x.id)).order("created_at",{ascending:false}).limit(2000):{data:[]};
   return json(200,{teacher,classes:(assign||[]).map(x=>Array.isArray(x.classes)?x.classes[0]:x.classes).filter(Boolean),subjects,terms:terms||[],students:students.map(x=>({...x,class_name:(Array.isArray(x.classes)?x.classes[0]:x.classes)?.name})),results:(results||[]).map(x=>({...x,student_name:x.student_id,subject_name:x.subjects?.name,term:x.terms?.name,session:x.terms?.academic_sessions?.name}))});
  }
  if(event.httpMethod!=="POST")return json(405,{error:"Method Not Allowed"});
  const b=JSON.parse(event.body||"{}");
  if(b.action!=="save-result")return json(400,{error:"Unsupported Teacher action."});
  const{data:student}=await db.from("students").select("id,class_id,classes(name)").eq("id",b.student_id).maybeSingle();
  if(!student)return json(404,{error:"Student not found."});
  const studentClass=(Array.isArray(student.classes)?student.classes[0]:student.classes)?.name;
  if(studentClass!==teacher.assigned_class)return json(403,{error:"You can only enter results for your assigned class."});
  const{data:subject}=await db.from("subjects").select("id").eq("id",b.subject_id).maybeSingle();if(!subject)return json(400,{error:"Subject not found."});
  const{data:term}=await db.from("terms").select("id").eq("id",b.term_id).maybeSingle();if(!term)return json(400,{error:"Term not found."});
  const ca=Number(b.ca_score),exam=Number(b.exam_score);if(!Number.isFinite(ca)||!Number.isFinite(exam)||ca<0||ca>30||exam<0||exam>70)return json(400,{error:"CA must be 0-30 and Exam must be 0-70."});
  const total=ca+exam,grade=total>=70?"A":total>=60?"B":total>=50?"C":total>=40?"D":"F";
  const payload={student_id:b.student_id,subject_id:b.subject_id,term_id:b.term_id,ca_score:ca,exam_score:exam,total_score:total,grade,teacher_comment:String(b.teacher_comment||"").trim()||null,recorded_by:teacher.id};
  let q;
  if(b.id)q=await db.from("results").update(payload).eq("id",b.id).select().single();
  else q=await db.from("results").insert(payload).select().single();
  if(q.error)throw q.error;return json(200,{data:q.data});
 }catch(e){console.error(e);return json(500,{error:e.message||"Teacher operation could not be completed."})}
};