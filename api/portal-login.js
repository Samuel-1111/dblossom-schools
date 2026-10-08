const {admin,normPhone,limiter,clientIp}=require("../netlify/functions/_supabase");

function send(res,status,body){
  res.status(status);
  res.setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","no-store");
  return res.json(body);
}

module.exports=async function(req,res){
  if(req.method!=="POST") return send(res,405,{error:"Method Not Allowed"});
  const ip=clientIp({headers:req.headers||{}});
  if(limiter.blocked(ip)) return send(res,429,{error:"Too many login attempts. Please wait 15 minutes and try again."});

  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
    const role=String(body.role||"").trim().toLowerCase();
    const identifier=String(body.identifier||"").trim();
    if(!["student","teacher","parent"].includes(role)||!identifier){
      limiter.fail(ip);
      return send(res,400,{error:"A valid portal role and login ID are required."});
    }

    const sb=admin();
    let profileId=null;

    if(role==="student"){
      const {data,error}=await sb.from("students")
        .select("profile_id,status")
        .ilike("admission_number",identifier)
        .maybeSingle();
      if(error) throw error;
      if(!data||!data.profile_id||String(data.status||"active").toLowerCase()!=="active"){
        limiter.fail(ip);
        return send(res,401,{error:"Student account not found or inactive."});
      }
      profileId=data.profile_id;
    }

    if(role==="teacher"){
      const {data,error}=await sb.from("teachers")
        .select("profile_id,status")
        .ilike("staff_id",identifier)
        .maybeSingle();
      if(error) throw error;
      if(!data||!data.profile_id||String(data.status||"active").toLowerCase()!=="active"){
        limiter.fail(ip);
        return send(res,401,{error:"Teacher account not found or inactive."});
      }
      profileId=data.profile_id;
    }

    if(role==="parent"){
      const email=identifier.toLowerCase();
      const phone=normPhone(identifier);
      let data=null,error=null;
      ({data,error}=await sb.from("parent_profiles").select("parent_id").ilike("email",email).maybeSingle());
      if(error) throw error;
      if(!data){
        const r=await sb.from("parent_profiles").select("parent_id,phone").not("phone","is",null);
        if(r.error) throw r.error;
        data=(r.data||[]).find(x=>normPhone(x.phone)===phone)||null;
      }
      if(!data||!data.parent_id){
        limiter.fail(ip);
        return send(res,401,{error:"Parent account not found. Ask the school to activate your portal account."});
      }
      profileId=data.parent_id;
    }

    const {data:userData,error:userError}=await sb.auth.admin.getUserById(profileId);
    if(userError||!userData?.user?.email){
      limiter.fail(ip);
      return send(res,401,{error:"This portal account is not connected to a sign-in account yet."});
    }

    limiter.clear(ip);
    return send(res,200,{ok:true,login_email:userData.user.email,role});
  }catch(error){
    console.error("portal-login:",error);
    return send(res,500,{error:"Portal login could not be completed. Please try again."});
  }
};
