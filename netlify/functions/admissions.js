const{admin}=require("./_supabase");
const crypto=require("crypto");
const hashKey=value=>crypto.createHash("sha256").update(String(value||"").trim().toUpperCase()).digest("hex");
const makeKey=()=> "DBMS-"+crypto.randomBytes(4).toString("hex").toUpperCase();
const sameHash=(a,b)=>{const x=Buffer.from(hashKey(a)),y=Buffer.from(String(b||""));return x.length===y.length&&crypto.timingSafeEqual(x,y)};
exports.handler=async event=>{
 try{
  const sb=admin();
  if(event.httpMethod==="POST"){
   const b=JSON.parse(event.body||"{}");
   if(!b.applicant_name||!b.parent_name)return{statusCode:400,body:JSON.stringify({error:"Applicant and parent names are required."})};
   const{data,error}=await sb.from("admission_applications").insert({
    applicant_name:String(b.applicant_name).trim(),
    date_of_birth:b.date_of_birth||null,
    gender:b.gender||null,
    class_applied:b.class_applied||null,
    parent_name:String(b.parent_name).trim(),
    parent_email:b.parent_email||null,
    parent_phone:b.parent_phone||null,
    address:b.address||null,
    status:"Under Review"
   }).select("application_number,status,applicant_name").single();
   if(error)throw error;
   return{statusCode:200,body:JSON.stringify({data})};
  }
  if(event.httpMethod==="GET"){
   const q=String(event.queryStringParameters?.application_number||"").trim();
   const key=String(event.queryStringParameters?.admission_key||"").trim();
   if(!q||!key)return{statusCode:400,body:JSON.stringify({error:"Application number and admission key are required."})};
   const{data,error}=await sb.from("admission_applications").select("application_number,applicant_name,date_of_birth,gender,class_applied,parent_name,parent_email,parent_phone,address,status,created_at").eq("application_number",q).maybeSingle();
   if(error)throw error;
   if(!data)return{statusCode:404,body:JSON.stringify({error:"Application not found."})};
   if(String(data.status).toLowerCase()!=="approved")return{statusCode:403,body:JSON.stringify({error:"This admission has not been approved yet. Please check again after the school approves it."})};
   const{data:keyRow,error:keyError}=await sb.from("admission_applications").select("admission_key_hash").eq("application_number",q).maybeSingle();
   if(keyError)throw keyError;
   if(!keyRow?.admission_key_hash||!sameHash(key,keyRow.admission_key_hash))return{statusCode:401,body:JSON.stringify({error:"Invalid admission key."})};
   return{statusCode:200,body:JSON.stringify({data})};
  }
  return{statusCode:405,body:"Method Not Allowed"};
 }catch(e){console.error("admissions",e);return{statusCode:500,body:JSON.stringify({error:"Admission service is temporarily unavailable."})}}
};