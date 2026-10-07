const{admin}=require("./_supabase");
const crypto=require("crypto");
const USERNAME="DivineBlossom";
const ADMIN_PASSWORD_SHA256="e8b791d8ba7e8f3451834859a3b54c426a2198016d369f0ca5e1b41f601f8258";
const EMAIL="divineblossom@dblossom.local";
const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(body)});
exports.handler=async event=>{
 if(event.httpMethod!=="POST")return json(405,{error:"Method Not Allowed"});
 try{
  const b=JSON.parse(event.body||"{}"),username=String(b.username||"").trim(),password=String(b.password||"");
  const passwordHash=crypto.createHash("sha256").update(password).digest("hex");
  if(username!==USERNAME||passwordHash!==ADMIN_PASSWORD_SHA256)return json(401,{error:"Incorrect username or password."});
  const db=admin(),listed=await db.auth.admin.listUsers({page:1,perPage:1000});
  if(listed.error)throw listed.error;
  let user=(listed.data.users||[]).find(x=>String(x.email).toLowerCase()===EMAIL.toLowerCase())||null;
  if(!user){
   const created=await db.auth.admin.createUser({email:EMAIL,password,user_metadata:{full_name:"D'Blossom Administrator"},email_confirm:true});
   if(created.error)throw created.error;
   user=created.data.user;
  }else{
   const{error}=await db.auth.admin.updateUserById(user.id,{password,email_confirm:true});
   if(error)throw error;
  }
  const{data:profile,error:pe}=await db.from("profiles").select("id,role").eq("id",user.id).maybeSingle();
  if(pe)throw pe;
  if(!profile){
   const{error}=await db.from("profiles").insert({id:user.id,full_name:"D'Blossom Administrator",role:"admin"});
   if(error)throw error;
  }else if(!["admin","super_admin"].includes(String(profile.role))){
   const{error}=await db.from("profiles").update({role:"admin",full_name:"D'Blossom Administrator"}).eq("id",user.id);
   if(error)throw error;
  }
  const signed=await db.auth.signInWithPassword({email:EMAIL,password});
  if(signed.error)return json(401,{error:"Incorrect username or password."});
  return json(200,{access_token:signed.data.session.access_token,refresh_token:signed.data.session.refresh_token,expires_at:signed.data.session.expires_at,user:{id:user.id,email:EMAIL}});
 }catch(e){console.error("admin-login",e);return json(500,{error:"Administrator login could not be completed. Please try again."});}
};