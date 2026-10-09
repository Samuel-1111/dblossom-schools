import {getSupabase,esc} from "./supabase.js";const $=s=>document.querySelector(s);function toast(m){const e=document.createElement("div");e.className="toast";e.textContent=m;document.body.append(e);setTimeout(()=>e.remove(),3500)}async function loadPublic(){
 try{
  const sb=await getSupabase();
  const gallery=await sb.from("gallery_images").select("id,title,alt_text,image_url").order("created_at",{ascending:false}).limit(6);
  const events=await sb.from("events").select("id,title,description,event_date,image_url").order("event_date",{ascending:true}).limit(6);
  const gc=$("#home-gallery"),ec=$("#home-events");
  if(gc){
   if(gallery.error)gc.innerHTML='<p class="notice">The school gallery is temporarily unavailable. Please try again later.</p>';
   else if(!gallery.data?.length)gc.innerHTML="";
   else gc.innerHTML=gallery.data.map(x=>'<article class="card media-card"><img loading="lazy" src="'+esc(x.image_url)+'" alt="'+esc(x.alt_text||x.title)+'"><div class="body"><h3>'+esc(x.title)+'</h3></div></article>').join("");
  }
  if(ec){
   if(events.error)ec.innerHTML='<p class="notice">The school events calendar is temporarily unavailable. Please try again later.</p>';
   else if(!events.data?.length)ec.innerHTML="";
   else ec.innerHTML=events.data.map(x=>{
    const image=x.image_url?'<img loading="lazy" src="'+esc(x.image_url)+'" alt="">':"";
    return '<article class="card event-card">'+image+'<div class="body"><small>'+new Date(x.event_date+"T00:00:00").toLocaleDateString()+'</small><h3>'+esc(x.title)+'</h3><p>'+esc(x.description||"")+'</p></div></article>';
   }).join("");
  }
 }catch(e){console.error("Public homepage content failed to load:",e)}
}function bindForms(){const af=$("#admission-form-home");if(af)af.addEventListener("submit",async e=>{e.preventDefault();const n=$("#admission-home-notice"),b=af.querySelector("button[type=submit]");n.className="form-notice";n.textContent="Submitting application…";b.disabled=true;try{const data=Object.fromEntries(new FormData(af)),r=await fetch("/api/admissions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)}),p=await r.json().catch(()=>({}));if(!r.ok)throw Error(p.error||"Application could not be submitted.");af.reset();n.className="form-notice success";n.textContent="Application submitted successfully. Application number: "+(p.data?.application_number||"generated") }catch(err){n.className="form-notice danger";n.textContent=err.message||"Application could not be submitted."}finally{b.disabled=false}});const cf=$("#contact-form");if(cf)cf.addEventListener("submit",async e=>{e.preventDefault();const n=$("#contact-notice"),b=cf.querySelector("button[type=submit]");n.textContent="Sending…";b.disabled=true;try{const f=new FormData(cf),payload={name:String(f.get("name")||"").trim(),email:String(f.get("email")||"").trim(),phone:String(f.get("phone")||"").trim(),subject:String(f.get("subject")||"").trim(),message:String(f.get("message")||"").trim()},r=await fetch("/api/contact",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}),p=await r.json().catch(()=>({}));if(!r.ok)throw Error(p.error||"Message could not be sent.");cf.reset();n.className="form-notice success";n.textContent="Your enquiry has been sent to the school."}catch(err){n.className="form-notice danger";n.textContent=err.message||"Message could not be sent. Please try again.";console.error(err)}finally{b.disabled=false}});}loadPublic();bindForms();