const{admin,userFrom,isAdmin}=require("./_supabase");
const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(body)});
const parse=(e)=>{try{return JSON.parse(e.body||"{}")}catch{return{}}};
async function guard(e){const u=await userFrom(e);if(!u||!(await isAdmin(u)))return{error:json(403,{error:"Administrator access required."})};return{user:u,db:admin()}};
async function log(db,user,action,type,id,details={}){try{await db.from("audit_logs").insert({actor_profile_id:user.id,action,entity_type:type,entity_id:id?String(id):null,details})}catch{}}
const page=async(q,n=100)=>{const{data,error,count}=await q.range(0,n-1);if(error)throw error;return{data:data||[],count:count||0}};
exports.handler=async e=>{
 const g=await guard(e);if(g.error)return g.error;const{db,user}=g;
 try{
  if(e.httpMethod==="GET"){
   const qs=e.queryStringParameters||{}, studentId=qs.student_id;
   if(studentId){
    const [s,r,a,i,d,p]=await Promise.all([
      db.from("students").select("id,full_name,admission_number,class_id,status,date_of_birth,gender,guardian_name,guardian_contact,boarding_status,classes(name)").eq("id",studentId).maybeSingle(),
      db.from("results").select("id,ca_score,exam_score,total_score,grade,teacher_comment,principal_comment,approved,subjects(name),terms(name,academic_sessions(name))").eq("student_id",studentId).order("term_id"),
      db.from("attendance").select("date,status").eq("student_id",studentId).order("date",{ascending:false}).limit(365),
      db.from("fee_invoices").select("*").eq("student_id",studentId).order("created_at",{ascending:false}).limit(100),
      db.from("student_documents").select("*").eq("student_id",studentId).order("created_at",{ascending:false}).limit(100),
      db.from("student_promotions").select("*,from_class:classes!student_promotions_from_class_id_fkey(name),to_class:classes!student_promotions_to_class_id_fkey(name)").eq("student_id",studentId).order("promoted_at",{ascending:false})
    ]);
    for(const x of [s,r,a,i,d,p])if(x.error)throw x.error;
    return json(200,{student:s.data,results:r.data||[],attendance:a.data||[],invoices:i.data||[],documents:d.data||[],promotions:p.data||[]});
   }
   const names=["students","teachers","parent_profiles","results","fee_invoices","fee_payments","admission_applications","announcements","parent_messages","audit_logs"];
   const counts=await Promise.all(names.map(t=>db.from(t).select("id",{count:"exact",head:true})));
   const summary=Object.fromEntries(names.map((n,i)=>[n,counts[i].count||0]));
   const [invoices,payments,cats,parents,ann,events,msg,prom,docs,locks,sessions,terms,admissions,roles,perms,logs,settings]=await Promise.all([
    page(db.from("fee_invoices").select("*,students(full_name,admission_number)").order("created_at",{ascending:false}),100),
    page(db.from("fee_payments").select("*").order("created_at",{ascending:false}),200),
    page(db.from("fee_categories").select("*").order("name"),100),
    page(db.from("parent_profiles").select("id,profile_id,full_name,email,phone,status,address,occupation,created_at").order("created_at",{ascending:false}),100),
    page(db.from("announcements").select("*").order("pinned",{ascending:false}).order("created_at",{ascending:false}),100),
    page(db.from("parent_calendar_events").select("*").order("event_date"),100),
    page(db.from("parent_messages").select("*").order("created_at",{ascending:false}),100),
    page(db.from("student_promotions").select("*,students(full_name,admission_number)").order("promoted_at",{ascending:false}),100),
    page(db.from("student_documents").select("*,students(full_name,admission_number)").order("created_at",{ascending:false}),100),
    page(db.from("result_locks").select("*,classes(name),terms(name,academic_sessions(name))").order("locked_at",{ascending:false}),100),
    page(db.from("academic_sessions").select("*").order("name",{ascending:false}),100),
    page(db.from("terms").select("*,academic_sessions(name)").order("name"),100),
    page(db.from("admission_applications").select("*").order("created_at",{ascending:false}),100),
    page(db.from("staff_roles").select("*").order("name"),100),
    page(db.from("staff_role_permissions").select("*"),500),
    page(db.from("audit_logs").select("*").order("created_at",{ascending:false}),200),
    db.from("school_settings").select("*").eq("id",true).maybeSingle()
   ]);
   for(const x of [invoices,payments,cats,parents,ann,events,msg,prom,docs,locks,sessions,terms,admissions,roles,perms,logs])if(x&&x.data===undefined&&x.error)throw x.error;
   return json(200,{summary,invoices:invoices.data||[],payments:payments.data||[],categories:cats.data||[],parents:parents.data||[],announcements:ann.data||[],events:events.data||[],messages:msg.data||[],promotions:prom.data||[],documents:docs.data||[],locks:locks.data||[],sessions:sessions.data||[],terms:terms.data||[],admissions:admissions.data||[],roles:roles.data||[],role_permissions:perms.data||[],audit:logs.data||[],settings:settings.data||null});
  }
  if(e.httpMethod!=="POST")return json(405,{error:"Method Not Allowed"});
  const b=parse(e),type=String(b.type||"");
  const save=async(table,payload,id)=>{let q=id?db.from(table).update(payload).eq("id",id):db.from(table).insert(payload);const{data,error}=await q.select().single();if(error)throw error;await log(db,user,id?"update":"create",table,data.id,payload);return data};
  if(type==="fee-category"){if(b.action==="delete"){const{error}=await db.from("fee_categories").delete().eq("id",b.id);if(error)throw error;await log(db,user,"delete","fee_category",b.id);return json(200,{ok:true})}const d=await save("fee_categories",{name:String(b.name).trim(),description:b.description||null,default_amount:Number(b.default_amount||0),active:b.active!==false},b.id);return json(200,{data:d})}
  if(type==="invoice"){const total=Math.max(0,Number(b.total_amount||0)-Number(b.discount_amount||0));const payload={student_id:b.student_id,session_id:b.session_id||null,term_id:b.term_id||null,invoice_number:String(b.invoice_number||("DBMS-INV-"+Date.now())),due_date:b.due_date||null,total_amount:total,amount_paid:Number(b.amount_paid||0),balance:Math.max(total-Number(b.amount_paid||0),0),status:Number(b.amount_paid||0)>=total?"Paid":Number(b.amount_paid||0)>0?"Partially Paid":"Unpaid",notes:b.notes||null,discount_amount:Number(b.discount_amount||0),currency:"NGN",created_by:user.id};const d=await save("fee_invoices",payload,b.id);return json(200,{data:d})}
  if(type==="manual-payment"){const amount=Number(b.amount||0);if(amount<=0)throw Error("Enter a valid payment amount.");const{data:inv,error:ie}=await db.from("fee_invoices").select("id,student_id,balance").eq("id",b.invoice_id).single();if(ie)throw ie;if(amount>Number(inv.balance))throw Error("Payment cannot exceed the outstanding balance.");const{data:p,error:pe}=await db.from("fee_payments").insert({invoice_id:inv.id,student_id:inv.student_id,parent_id:b.parent_id||null,amount,method:b.method||"Manual",reference:b.reference||("MAN-"+Date.now()),status:"Pending",notes:b.notes||null}).select().single();if(pe)throw pe;const{data:r,error:re}=await db.rpc("record_fee_payment",{p_payment_id:p.id,p_invoice_id:inv.id,p_amount:amount,p_reference:p.reference,p_method:p.method});if(re)throw re;await log(db,user,"confirm","fee_payment",p.id,r);return json(200,{data:r})}
  if(type==="parent"){if(b.action==="link"){const{data:d,error}=await db.from("parent_student_links").upsert({parent_id:b.parent_id,student_id:b.student_id,relationship:b.relationship||"Parent",is_primary:b.is_primary===true},{onConflict:"parent_id,student_id"}).select().single();if(error)throw error;await log(db,user,"link","parent_student",d.id,{parent_id:b.parent_id,student_id:b.student_id});return json(200,{data:d})}if(b.action==="unlink"){const{error}=await db.from("parent_student_links").delete().eq("parent_id",b.parent_id).eq("student_id",b.student_id);if(error)throw error;return json(200,{ok:true})}const d=await save("parent_profiles",{full_name:String(b.full_name).trim(),email:b.email||null,phone:b.phone||null,status:b.status||"Active",address:b.address||null,occupation:b.occupation||null},b.id);return json(200,{data:d})}
  if(type==="announcement"){if(b.action==="delete"){const{error}=await db.from("announcements").delete().eq("id",b.id);if(error)throw error;return json(200,{ok:true})}const d=await save("announcements",{title:String(b.title).trim(),body:String(b.body).trim(),audience:b.audience||"all",target_class_id:b.target_class_id||null,target_student_id:b.target_student_id||null,pinned:b.pinned===true,status:b.status||"Published",publish_at:b.publish_at||null,expires_at:b.expires_at||null,posted_by:user.id},b.id);return json(200,{data:d})}
  if(type==="calendar"){if(b.action==="delete"){const{error}=await db.from("parent_calendar_events").delete().eq("id",b.id);if(error)throw error;return json(200,{ok:true})}const d=await save("parent_calendar_events",{title:String(b.title).trim(),description:b.description||null,event_date:b.event_date,start_time:b.start_time||null,end_time:b.end_time||null,audience:b.audience||"all",class_id:b.class_id||null,created_by:user.id},b.id);return json(200,{data:d})}
  if(type==="message"){if(b.action==="read"){const{error}=await db.from("parent_messages").update({read_at:new Date().toISOString()}).eq("id",b.id);if(error)throw error;return json(200,{ok:true})}const d=await save("parent_messages",{parent_id:b.parent_id,sender_profile_id:user.id,recipient_profile_id:b.recipient_profile_id||null,student_id:b.student_id||null,subject:b.subject||"School message",body:String(b.body).trim()});if(b.parent_id)await db.from("parent_notifications").insert({parent_id:b.parent_id,title:"New message from school",body:String(b.body).trim(),type:"message"});return json(200,{data:d})}
  if(type==="promotion"){const ids=Array.isArray(b.student_ids)?b.student_ids:[];if(!ids.length)throw Error("Select at least one student.");for(const sid of ids){const{data:s,error:se}=await db.from("students").select("class_id").eq("id",sid).single();if(se)throw se;await db.from("student_promotions").insert({student_id:sid,from_class_id:s.class_id,to_class_id:b.to_class_id||null,from_session_id:b.from_session_id||null,to_session_id:b.to_session_id||null,status:b.status||"Promoted",promoted_by:user.id});await db.from("students").update({class_id:b.to_class_id||null}).eq("id",sid)}await log(db,user,"promote","students",null,{count:ids.length,to_class_id:b.to_class_id});return json(200,{ok:true,count:ids.length})}
  if(type==="lock"){const payload={class_id:b.class_id||null,term_id:b.term_id||null,locked:b.locked!==false,locked_by:user.id,locked_at:new Date().toISOString()};const{data,error}=await db.from("result_locks").upsert(payload,{onConflict:"class_id,term_id"}).select().single();if(error)throw error;await log(db,user,payload.locked?"lock":"unlock","result_lock",data.id,payload);return json(200,{data})}
  if(type==="session"){if(b.action==="delete"){const{error}=await db.from("academic_sessions").delete().eq("id",b.id);if(error)throw error;return json(200,{ok:true})}if(b.active){await db.from("academic_sessions").update({is_active:false}).neq("id",b.id||"00000000-0000-0000-0000-000000000000")}const d=await save("academic_sessions",{name:String(b.name).trim(),is_active:b.active===true},b.id);return json(200,{data:d})}
  if(type==="term"){if(b.active){await db.from("terms").update({is_active:false}).neq("id",b.id||"00000000-0000-0000-0000-000000000000")}const d=await save("terms",{session_id:b.session_id,name:b.name,is_active:b.active===true},b.id);return json(200,{data:d})}
  if(type==="role-permission"){const{data,error}=await db.from("staff_role_permissions").upsert({role_id:b.role_id,permission:b.permission,allowed:b.allowed!==false},{onConflict:"role_id,permission"}).select().single();if(error)throw error;return json(200,{data})}
  if(type==="admission"){const d=await save("admission_applications",{status:b.status,notes:b.notes||null,interview_date:b.interview_date||null,interview_notes:b.interview_notes||null,reviewed_by:user.id},b.id);return json(200,{data:d})}
  if(type==="settings"){const d=await save("school_settings",{school_name:b.school_name,slogan:b.slogan||null,phone:b.phone||null,email:b.email||null,address:b.address||null,whatsapp:b.whatsapp||null,session_name:b.session_name||null,primary_color:b.primary_color||"220 70% 25%",secondary_color:b.secondary_color||"43 85% 55%",result_access_fee_kobo:Number(b.result_access_fee_kobo||100000),updated_at:new Date().toISOString()},true);return json(200,{data:d})}
  if(type==="document"){if(b.action==="delete"){const{error}=await db.from("student_documents").delete().eq("id",b.id);if(error)throw error;return json(200,{ok:true})}const d=await save("student_documents",{student_id:b.student_id,title:String(b.title).trim(),document_type:b.document_type||"Other",file_url:b.file_url,file_name:b.file_name||null,file_size:b.file_size||null,uploaded_by:user.id},b.id);return json(200,{data:d})}
  return json(400,{error:"Unknown operation."});
 }catch(err){console.error("admin-advanced",err);return json(500,{error:err.message||"Operation failed."})}
};