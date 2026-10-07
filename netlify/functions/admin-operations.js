const { admin, userFrom, isAdmin } = require("./_supabase");

const clean = v => typeof v === "string" ? v.trim() : "";
const json = (statusCode, body) => ({ statusCode, headers: { "content-type":"application/json", "cache-control":"no-store" }, body: JSON.stringify(body) });
const safePage = event => Math.max(1, Number(event.queryStringParameters?.page || 1));
const safeSize = event => Math.min(100, Math.max(10, Number(event.queryStringParameters?.pageSize || 50)));

async function audit(db, user, action, entity_type, entity_id, details={}) {
  try { await db.from("audit_logs").insert({actor_profile_id:user.id,action,entity_type,entity_id:entity_id?String(entity_id):null,details}); } catch (_) {}
}
async function getAuthEmail(db, profileId) {
  const { data } = await db.auth.admin.getUserById(profileId);
  return data?.user?.email || null;
}
function internalEmail(prefix, id) {
  const normalized = String(prefix).toLowerCase().replace(/[^a-z0-9_-]/g,"");
  return normalized + "." + String(id).replace(/[^a-z0-9]/gi,"").toLowerCase() + "@accounts.dblossom.local";
}
async function createOrUpdateAuth(db, { profileId, role, password, identifier, email }) {
  let authEmail = email || internalEmail(role, identifier);
  if (profileId) {
    if (password) {
      const { error } = await db.auth.admin.updateUserById(profileId, { password });
      if (error) throw error;
    }
    return { profileId, email: authEmail };
  }
  const { data, error } = await db.auth.admin.createUser({ email: authEmail, password, email_confirm: true });
  if (error) throw error;
  const { error: pe } = await db.from("profiles").insert({ id:data.user.id, full_name:null, role });
  if (pe) { await db.auth.admin.deleteUser(data.user.id); throw pe; }
  return { profileId:data.user.id, email:authEmail };
}
async function upsertProfile(db,id,full_name,role) {
  const { error } = await db.from("profiles").upsert({id,full_name,role},{onConflict:"id"});
  if(error) throw error;
}
async function listData(db, table, page, pageSize, search, order="created_at") {
  let q = db.from(table).select("*",{count:"exact"});
  if(search) {
    const s = search.replace(/[%_,]/g," ");
    if(table==="students") q=q.or("full_name.ilike.%"+s+"%,admission_number.ilike.%"+s+"%");
    if(table==="teachers") q=q.or("full_name.ilike.%"+s+"%,staff_id.ilike.%"+s+"%");
    if(table==="complaints") q=q.or("name.ilike.%"+s+"%,subject.ilike.%"+s+"%,email.ilike.%"+s+"%");
  }
  const from=(page-1)*pageSize,to=from+pageSize-1;
  q=q.order(order,{ascending:false,nullsFirst:false}).range(from,to);
  const {data,error,count}=await q;
  if(error) throw error;
  return {data:data||[],count:count||0,page,pageSize};
}

exports.handler = async event => {
  try {
    const user = await userFrom(event);
    if(!await isAdmin(user)) return json(401,{error:"Administrator session required."});
    const db=admin();
    if(event.httpMethod==="GET") {
      const p=safePage(event), size=safeSize(event), q=clean(event.queryStringParameters?.q), classId=clean(event.queryStringParameters?.class_id), table=clean(event.queryStringParameters?.table);
      if(table==="students"||table==="teachers"||table==="complaints"||table==="events"||table==="gallery_images"||table==="subjects"||table==="fee_payments"||table==="fee_invoices"||table==="announcements"||table==="admission_applications") {
        const result=await listData(db,table,p,size,q);
        if(table==="fee_payments"){const {data,error,count}=await db.from("fee_payments").select("id,invoice_id,student_id,parent_id,amount,method,reference,status,paid_at,created_at,students(full_name,admission_number,class_id,classes(name))",{count:"exact"}).order("created_at",{ascending:false}).range((p-1)*size,p*size-1);if(error)throw error;return json(200,{data:data||[],count:count||0,page:p,pageSize:size});}
      if(table==="students"){
          const ids=[...new Set(result.data.map(x=>x.class_id).filter(Boolean))];
          const {data:classes}=ids.length?await db.from("classes").select("id,name").in("id",ids):{data:[]};
          const cm=new Map((classes||[]).map(x=>[x.id,x.name])); result.data=result.data.map(x=>({...x,class_name:cm.get(x.class_id)||"—"}));
        }
        return json(200,result);
      }
      if(table==="parent_messages"){const {data,error,count}=await db.from("parent_messages").select("id,parent_id,sender_profile_id,recipient_profile_id,student_id,subject,body,read_at,created_at,parent_profiles(full_name,email,phone),students(full_name,admission_number)",{count:"exact"}).order("created_at",{ascending:false}).range((p-1)*size,p*size-1);if(error)throw error;return json(200,{data:data||[],count:count||0,page:p,pageSize:size});}
      if(table==="results") {
        const term=clean(event.queryStringParameters?.term), classId=clean(event.queryStringParameters?.class_id);
        const {data,error}=await db.from("results").select("id,student_id,subject_id,term_id,ca_score,exam_score,total_score,grade,teacher_comment,principal_comment,approved,created_at,students(full_name,admission_number,class_id,classes(name)),subjects(name),terms(name,session_id,academic_sessions(name))").order("created_at",{ascending:false}).range((p-1)*size,p*size-1);
        if(error) throw error;
        let rows=data||[];
        if(term) rows=rows.filter(x=>x.terms?.name===term);
        if(classId) rows=rows.filter(x=>x.students?.class_id===classId);
        return json(200,{data:rows,count:rows.length,page:p,pageSize:size});
      }
      if(table==="classes") { const {data,error}=await db.from("classes").select("id,name,is_active").order("name"); if(error)throw error; return json(200,{data:data||[],count:(data||[]).length}); }
      if(table==="terms") { const {data,error}=await db.from("terms").select("id,name,session_id,is_active,academic_sessions(name)").order("session_id"); if(error)throw error; return json(200,{data:data||[],count:(data||[]).length}); }
      if(table==="sessions") { const {data,error}=await db.from("academic_sessions").select("id,name,is_active").order("name",{ascending:false}); if(error)throw error; return json(200,{data:data||[],count:(data||[]).length}); }
      return json(400,{error:"Unsupported table."});
    }
    if(event.httpMethod!=="POST"&&event.httpMethod!=="PUT"&&event.httpMethod!=="DELETE") return json(405,{error:"Method Not Allowed"});
    const b=JSON.parse(event.body||"{}"), type=clean(b.type), id=clean(b.id);

    if(type==="student") {
      if(!clean(b.full_name)||!clean(b.admission_number)||!clean(b.class_id)) return json(400,{error:"Full name, admission number and class are required."});
      
      const surname=(clean(b.full_name).split(/\s+/).filter(Boolean).pop()||"Student");const password=clean(b.password)||(surname.charAt(0).toUpperCase()+surname.slice(1).toLowerCase());
      let profileId=clean(b.profile_id)||null;
      if(!id) {
        const auth=await createOrUpdateAuth(db,{profileId:null,role:"student",password,identifier:b.admission_number,email:null});
        profileId=auth.profileId;
        await upsertProfile(db,profileId,clean(b.full_name),"student");
        const {data,error}=await db.from("students").insert({admission_number:clean(b.admission_number),full_name:clean(b.full_name),class_id:clean(b.class_id),date_of_birth:b.date_of_birth||null,guardian_name:clean(b.guardian_name)||null,guardian_contact:clean(b.guardian_contact)||null,gender:clean(b.gender)||null,parent_email:clean(b.parent_email)||null,boarding_status:clean(b.boarding_status)||null,status:clean(b.status)||"active",profile_id:profileId}).select().single();
        if(error){await db.auth.admin.deleteUser(profileId);throw error}
        await audit(db,user,"create","student",data.id,{admission_number:data.admission_number});
        return json(201,{data});
      }
      const {data:old}=await db.from("students").select("profile_id").eq("id",id).maybeSingle(); if(!old)return json(404,{error:"Student not found."});
      if(password&&old.profile_id) await createOrUpdateAuth(db,{profileId:old.profile_id,role:"student",password,identifier:b.admission_number});
      const {data,error}=await db.from("students").update({admission_number:clean(b.admission_number),full_name:clean(b.full_name),class_id:clean(b.class_id),date_of_birth:b.date_of_birth||null,guardian_name:clean(b.guardian_name)||null,guardian_contact:clean(b.guardian_contact)||null,gender:clean(b.gender)||null,parent_email:clean(b.parent_email)||null,boarding_status:clean(b.boarding_status)||null,status:clean(b.status)||"active"}).eq("id",id).select().single();
      if(error)throw error; if(old.profile_id)await upsertProfile(db,old.profile_id,data.full_name,"student"); await audit(db,user,"update","student",id,{}); return json(200,{data});
    }

    if(type==="teacher") {
      if(!clean(b.full_name)||!clean(b.staff_id)) return json(400,{error:"Full name and Staff ID are required."});
      if(!id&&!clean(b.password)) return json(400,{error:"Password is required for a new teacher."});
      if(!id) {
        const auth=await createOrUpdateAuth(db,{profileId:null,role:"teacher",password:clean(b.password),identifier:b.staff_id,email:clean(b.email)||null});
        await upsertProfile(db,auth.profileId,clean(b.full_name),"teacher");
        const {data,error}=await db.from("teachers").insert({full_name:clean(b.full_name),staff_id:clean(b.staff_id),email:clean(b.email)||null,phone:clean(b.phone)||null,subject:clean(b.subject)||null,role:clean(b.role)||"Teaching Staff",assigned_class:clean(b.assigned_class)||null,status:clean(b.status)||"active",profile_id:auth.profileId}).select().single();
        if(error){await db.auth.admin.deleteUser(auth.profileId);throw error} await audit(db,user,"create","teacher",data.id,{staff_id:data.staff_id});return json(201,{data});
      }
      const {data:old}=await db.from("teachers").select("profile_id").eq("id",id).maybeSingle();if(!old)return json(404,{error:"Teacher not found."});
      if(b.password&&old.profile_id)await createOrUpdateAuth(db,{profileId:old.profile_id,role:"teacher",password:clean(b.password),identifier:b.staff_id});
      const {data,error}=await db.from("teachers").update({full_name:clean(b.full_name),staff_id:clean(b.staff_id),email:clean(b.email)||null,phone:clean(b.phone)||null,subject:clean(b.subject)||null,role:clean(b.role)||"Teaching Staff",assigned_class:clean(b.assigned_class)||null,status:clean(b.status)||"active"}).eq("id",id).select().single();if(error)throw error;if(old.profile_id)await upsertProfile(db,old.profile_id,data.full_name,"teacher");await audit(db,user,"update","teacher",id,{});return json(200,{data});
    }

    if(type==="delete") {
      if(!id||!clean(b.table))return json(400,{error:"Record and table are required."});
      const allowed=["students","teachers","results","events","gallery_images","complaints","subjects"];
      if(!allowed.includes(b.table))return json(400,{error:"Deletion is not allowed for this table."});
      const {data:row}=await db.from(b.table).select("*").eq("id",id).maybeSingle();if(!row)return json(404,{error:"Record not found."});
      const {error}=await db.from(b.table).delete().eq("id",id);if(error)throw error;
      if((b.table==="students"||b.table==="teachers")&&row.profile_id)await db.auth.admin.deleteUser(row.profile_id);
      await audit(db,user,"delete",b.table,id,{});return json(200,{ok:true});
    }

    if(type==="message-status"){if(!id)return json(400,{error:"Message ID is required."});const status=clean(b.status);const patch=status==="Read"?{read_at:new Date().toISOString()}:status==="Unread"?{read_at:null}:null;if(!patch)return json(400,{error:"Invalid message status."});const{data,error}=await db.from("parent_messages").update(patch).eq("id",id).select().single();if(error)throw error;await audit(db,user,"update","parent_message",id,{status});return json(200,{data});}
    if(type==="message-reply"){if(!id||!clean(b.body))return json(400,{error:"Message and reply are required."});const{data:msg}=await db.from("parent_messages").select("parent_id,student_id,subject").eq("id",id).maybeSingle();if(!msg)return json(404,{error:"Message not found."});const{data:parent}=await db.from("parent_profiles").select("profile_id").eq("id",msg.parent_id).maybeSingle();if(!parent?.profile_id)return json(400,{error:"Parent account not found."});const{data,error}=await db.from("parent_messages").insert({parent_id:msg.parent_id,sender_profile_id:user.id,recipient_profile_id:parent.profile_id,student_id:msg.student_id,subject:clean(b.subject)||"Re: "+(msg.subject||"School message"),body:clean(b.body)}).select().single();if(error)throw error;await db.from("parent_messages").update({read_at:new Date().toISOString()}).eq("id",id);await audit(db,user,"create","parent_message",data.id,{reply_to:id});return json(201,{data});}
    if(type==="payment-status"){const status=["Confirmed","Rejected","Pending"].includes(b.status)?b.status:null;if(!status||!id)return json(400,{error:"Valid payment status and payment ID are required."});const{data,error}=await db.from("fee_payments").update({status,paid_at:status==="Confirmed"?new Date().toISOString():null}).eq("id",id).select().single();if(error)throw error;await audit(db,user,"update","fee_payment",id,{status});return json(200,{data});}
    if(type==="complaint-status"){const status=["New","Read","Resolved"].includes(b.status)?b.status:null;if(!status||!id)return json(400,{error:"Valid complaint status is required."});const{data,error}=await db.from("complaints").update({status}).eq("id",id).select().single();if(error)throw error;await audit(db,user,"update","complaint",id,{status});return json(200,{data});}
    if(type==="announcement"){if(!clean(b.title)||!clean(b.body))return json(400,{error:"Announcement title and body are required."});const{data,error}=await db.from("announcements").insert({title:clean(b.title),body:clean(b.body),posted_by:user.id,audience:clean(b.audience)||"all",target_class_id:clean(b.target_class_id)||null,target_student_id:clean(b.target_student_id)||null,pinned:Boolean(b.pinned),status:"Published"}).select().single();if(error)throw error;await audit(db,user,"create","announcement",data.id,{});return json(201,{data});}
    if(type==="upload-image"){const raw=String(b.data||"");const mime=String(b.mime||"");if(!/^image\\/(png|jpeg|jpg|webp|gif)$/.test(mime)||!raw.startsWith("data:"))return json(400,{error:"Only PNG, JPG, WEBP and GIF images are supported."});const base64=raw.split(",")[1]||"";const buffer=Buffer.from(base64,"base64");if(buffer.length>4*1024*1024)return json(400,{error:"Image must be 5MB or smaller."});const ext=mime==="image/jpeg"||mime==="image/jpg"?"jpg":mime.split("/")[1];const key=(clean(b.kind)||"uploads")+"/"+Date.now()+"-"+Math.random().toString(36).slice(2,10)+"."+ext;const bucket=process.env.SUPABASE_STORAGE_BUCKET||"school-media";const{error}=await db.storage.from(bucket).upload(key,buffer,{contentType:mime,upsert:false});if(error)throw error;return json(200,{key,url:"/api/manus-storage/"+encodeURIComponent(key)});}
    if(type==="event"){if(!clean(b.title)||!b.event_date)return json(400,{error:"Event title and date are required."});const payload={title:clean(b.title),description:clean(b.description),event_date:b.event_date,category:clean(b.category)||"Other",status:clean(b.status)||"Published",image_url:clean(b.image_url)||null,created_by:user.id};const{data,error}=id?await db.from("events").update(payload).eq("id",id).select().single():await db.from("events").insert(payload).select().single();if(error)throw error;await audit(db,user,id?"update":"create","event",data.id,{});return json(id?200:201,{data});}
    if(type==="gallery"){if(!clean(b.title)||!clean(b.image_url))return json(400,{error:"Gallery title and image URL are required."});const payload={title:clean(b.title),alt_text:clean(b.alt_text)||clean(b.title),image_url:clean(b.image_url),category:clean(b.category)||"Other",created_by:user.id};const{data,error}=id?await db.from("gallery_images").update(payload).eq("id",id).select().single():await db.from("gallery_images").insert(payload).select().single();if(error)throw error;await audit(db,user,id?"update":"create","gallery_image",data.id,{});return json(id?200:201,{data});}
    if(type==="subject"){if(!clean(b.name))return json(400,{error:"Subject name is required."});const{data,error}=id?await db.from("subjects").update({name:clean(b.name),class_id:clean(b.class_id)||null}).eq("id",id).select().single():await db.from("subjects").insert({name:clean(b.name),class_id:clean(b.class_id)||null}).select().single();if(error)throw error;await audit(db,user,id?"update":"create","subject",data.id,{});return json(id?200:201,{data});}
    if(type==="result"){if(!clean(b.student_id)||!clean(b.subject_id)||!clean(b.term_id))return json(400,{error:"Student, subject and term are required."});const ca=Number(b.ca_score),exam=Number(b.exam_score);if(!Number.isFinite(ca)||!Number.isFinite(exam)||ca<0||ca>30||exam<0||exam>70)return json(400,{error:"CA must be 0-30 and Exam must be 0-70."});const total=ca+exam,grade=total>=70?"A":total>=60?"B":total>=50?"C":total>=40?"D":"F";const payload={student_id:b.student_id,subject_id:b.subject_id,term_id:b.term_id,ca_score:ca,exam_score:exam,total_score:total,grade,teacher_comment:clean(b.teacher_comment)||null,principal_comment:clean(b.principal_comment)||null,approved:Boolean(b.approved),recorded_by:null};const {data,error}=id?await db.from("results").update(payload).eq("id",id).select().single():await db.from("results").insert(payload).select().single();if(error)throw error;await audit(db,user,id?"update":"create","result",data.id,{});return json(id?200:201,{data});}
    if(type==="invoice"){const studentId=clean(b.student_id),items=Array.isArray(b.items)?b.items:[];if(!studentId||!items.length)return json(400,{error:"Student and at least one fee item are required."});const normalized=items.map(x=>({category_id:clean(x.category_id),description:clean(x.description)||"School fee",amount:Math.max(0,Number(x.amount||0))}));const{data,error}=await db.rpc("create_fee_invoice",{p_student_id:studentId,p_invoice_number:clean(b.invoice_number)||"INV-"+Date.now(),p_due_date:clean(b.due_date)||null,p_notes:clean(b.notes)||null,p_items:normalized,p_created_by:user.id});if(error)return json(400,{error:error.message});return json(201,{data});}
    if(type==="payment"){const amount=Number(b.amount);if(!id||!Number.isFinite(amount)||amount<=0)return json(400,{error:"Invoice and a valid payment amount are required."});const{data,error}=await db.rpc("record_fee_payment",{p_invoice_id:id,p_amount:amount,p_method:clean(b.method)||"Manual",p_reference:clean(b.reference)||"MANUAL-"+Date.now(),p_parent_id:clean(b.parent_id)||null});if(error)return json(400,{error:error.message});return json(201,{data});}
    if(type==="admission-status"){if(!id)return json(400,{error:"Application ID is required."});const allowed=["Pending","Under Review","Interview","Approved","Rejected"];if(!allowed.includes(b.status))return json(400,{error:"Invalid admission status."});const{data,error}=await db.from("admission_applications").update({status:b.status,notes:clean(b.notes)||null,interview_date:b.interview_date||null,interview_notes:clean(b.interview_notes)||null,reviewed_by:user.id,updated_at:new Date().toISOString()}).eq("id",id).select().single();if(error)throw error;await audit(db,user,"update","admission_application",id,{status:b.status});return json(200,{data});}
    return json(400,{error:"Unsupported administrator operation."});
  } catch(e) { console.error(e); return json(500,{error:e.message||"Administrator operation could not be completed."}); }
};