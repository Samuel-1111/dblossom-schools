const crypto=require("crypto");
const{admin,limiter,clientIp}=require("./_supabase");
const DEFAULT_USERNAME=process.env.ADMIN_USERNAME||"DivineBlossom";
const DEFAULT_EMAIL=(process.env.ADMIN_EMAIL||"divineblossom@dblossom.local").toLowerCase();
const FIRST_RUN_SHA256=process.env.ADMIN_INITIAL_PASSWORD_SHA256||"e8b791d8ba7e8f3451834859a3b54c426a2198016d369f0ca5e1b41f601f8258";
const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(body)});
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const same=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const DENY="Incorrect password.";
exports.handler=async event=>{
 if(event.httpMethod!=="POST")return json(405,{error:"Method Not Allowed"});
 try{
  let b={};try{b=JSON.parse(event.body||"{}")}catch{}
  const username=String(b.username||"").trim(),password=String(b.password||"");
  if(!username||!password)return json(400,{error:"Username and password are required."});
  const key="admin:"+username.toLowerCase()+":"+clientIp(event);
  if(limiter.blocked(key))return json(429,{error:"Too many attempts. Please wait 15 minutes and try again."});
  const byEmail=username.includes("@"),isDefault=!byEmail&&username.toLowerCase()===DEFAULT_USERNAME.toLowerCase();
  if(!byEmail&&!isDefault){limiter.fail(key);return json(401,{error:DENY})}
  const email=byEmail?username.toLowerCase():DEFAULT_EMAIL;
  let signed=await admin().auth.signInWithPassword({email,password});
  if((signed.error||!signed.data?.session)&&isDefault&&same(sha(password),FIRST_RUN_SHA256)){
   const created=await admin().auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:"D'Blossom Administrator"}});
   if(!created.error)signed=await admin().auth.signInWithPassword({email,password});
  }
  if(signed.error||!signed.data?.session){limiter.fail(key);return json(401,{error:DENY})}
  const user=signed.data.user,db=admin(),{data:profile,error:pe}=await db.from("profiles").select("id,role").eq("id",user.id).maybeSingle();
  if(pe)throw pe;
  const isAdminRole=profile&&["admin","super_admin"].includes(String(profile.role));
  if(!isAdminRole){
   if(!isDefault){limiter.fail(key);return json(401,{error:DENY})}
   const{error}=profile?await db.from("profiles").update({role:"admin",full_name:"D'Blossom Administrator"}).eq("id",user.id):await db.from("profiles").insert({id:user.id,full_name:"D'Blossom Administrator",role:"admin"});
   if(error)throw error;
  }
  limiter.clear(key);
  const session=signed.data.session;
  return json(200,{access_token:session.access_token,refresh_token:session.refresh_token,expires_at:session.expires_at,user:{id:user.id,email}});
 }catch(e){console.error("admin-login",e);return json(500,{error:"Administrator login could not be completed. Please try again."})}
};
