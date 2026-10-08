const crypto=require("crypto");
const{admin}=require("./_supabase");
const json=(statusCode,body)=>({statusCode,headers:{"content-type":"application/json","cache-control":"no-store"},body:JSON.stringify(body)});

exports.handler=async event=>{
  try{
    if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed."});
    const secret=process.env.PAYSTACK_SECRET_KEY;
    if(!secret)return json(503,{error:"Payment gateway is not configured."});
    const raw=event.body||"";
    const signature=event.headers?.["x-paystack-signature"]||event.headers?.["X-Paystack-Signature"]||"";
    const expected=crypto.createHmac("sha512",secret).update(raw).digest("hex");
    if(!signature||signature.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))return json(401,{error:"Invalid webhook signature."});
    const payload=JSON.parse(raw||"{}");
    if(payload.event!=="charge.success")return json(200,{ok:true});
    const t=payload.data||{};
    const reference=String(t.reference||"").trim();
    const metadata=t.metadata||{};
    const studentId=String(metadata.student_id||"").trim();
    if(!reference||!studentId||metadata.purpose!=="result_access")return json(200,{ok:true});
    if(String(t.status)!=="success"||Number(t.amount)!==100000||String(t.currency)!=="NGN")return json(200,{ok:true});
    const db=admin();
    const{data:p,error:pe}=await db.from("result_access_payments").select("id,student_id,status,amount_kobo,currency").eq("reference",reference).maybeSingle();
    if(pe)throw pe;
    if(!p||p.student_id!==studentId||Number(p.amount_kobo)!==100000||p.currency!=="NGN")return json(200,{ok:true});
    const{error:ue}=await db.from("result_access_payments").update({status:"success",paystack_status:"success",paid_at:t.paid_at||new Date().toISOString()}).eq("id",p.id);
    if(ue)throw ue;
    const{data:grant,error:ge}=await db.from("result_access_grants").select("id").eq("student_id",studentId).maybeSingle();
    if(ge)throw ge;
    if(!grant){
      const{error:ie}=await db.from("result_access_grants").insert({student_id:studentId,payment_id:p.id});
      if(ie)throw ie;
    }
    return json(200,{ok:true});
  }catch(e){
    console.error("paystack-webhook",e);
    return json(500,{error:"Webhook processing failed."});
  }
};