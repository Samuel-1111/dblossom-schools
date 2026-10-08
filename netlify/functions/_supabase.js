const{createClient}=require("@supabase/supabase-js");
function admin(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
async function userFrom(event){const h=event.headers?.authorization||event.headers?.Authorization||"";if(!h.startsWith("Bearer "))return null;const{data,error}=await admin().auth.getUser(h.slice(7));return error||!data.user?null:data.user}
async function isAdmin(user){if(!user)return false;const{data}=await admin().from("profiles").select("role").eq("id",user.id).maybeSingle();return !!data&&["admin","super_admin"].includes(String(data.role))}
function normPhone(v){let d=String(v||"").replace(/\D/g,"");if(d.startsWith("234")&&d.length>=13)d=d.slice(3);if(d.length===10)d="0"+d;return d}
function internalEmail(prefix,id){return String(prefix).toLowerCase().replace(/[^a-z0-9_-]/g,"")+"."+String(id).replace(/[^a-z0-9]/gi,"").toLowerCase()+"@accounts.dblossom.local"}
const attempts=new Map();
const limiter={blocked(key){const a=attempts.get(key);if(!a)return false;if(Date.now()-a.t>15*60*1000){attempts.delete(key);return false}return a.n>=8},fail(key){const a=attempts.get(key);if(!a||Date.now()-a.t>15*60*1000)attempts.set(key,{n:1,t:Date.now()});else a.n++},clear(key){attempts.delete(key)}};
const clientIp=e=>String(e.headers?.["x-nf-client-connection-ip"]||e.headers?.["x-forwarded-for"]||"").split(",")[0].trim()||"unknown";
module.exports={admin,userFrom,isAdmin,normPhone,internalEmail,limiter,clientIp};
