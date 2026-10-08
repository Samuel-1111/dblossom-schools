const form=document.querySelector("#contact-form");
if(form)form.addEventListener("submit",async e=>{
 e.preventDefault();
 const n=document.querySelector("#contact-notice"),b=form.querySelector("button");
 b.disabled=true;b.textContent="Sending…";n.textContent="";
 try{
  const f=new FormData(form),payload={name:String(f.get("name")||"").trim(),email:String(f.get("email")||"").trim(),phone:String(f.get("phone")||"").trim(),subject:String(f.get("subject")||"").trim(),message:String(f.get("message")||"").trim()};
  const response=await fetch("/api/contact",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||"We could not send your enquiry.");
  form.reset();n.className="form-notice success";n.textContent="Thank you. Your enquiry has been sent to the school.";
 }catch(err){console.error(err);n.className="form-notice danger";n.textContent=err.message||"We could not send your enquiry. Please try again."}
 finally{b.disabled=false;b.textContent="Send Enquiry"}
});