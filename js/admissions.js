const form=document.querySelector("#admission-form"),notice=document.querySelector("#admission-notice");
let submittedApplication=null;
const school={name:"D'Blossom Model Private Schools",motto:"Indomino Confidimus (In God We Trust)",address:"Divine Blossom Street, Agbogun Dam View, Obada Oko, Abeokuta, Ogun State, Nigeria",phone:"08123447514, 08037151183",email:"divineblossom999@gmail.com"};
function currentApplication(){const data=Object.fromEntries(new FormData(form));return submittedApplication?{...data,...submittedApplication}:data}
async function imageDataUrl(url){const response=await fetch(url);if(!response.ok)throw new Error("School logo could not be loaded.");const blob=await response.blob();return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})}
function cleanFileName(value){return String(value||"application").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"application"}
async function buildEmptyPdf(){
 const JsPDF=window.jspdf?.jsPDF;if(!JsPDF)throw new Error("PDF generator is unavailable. Please check your internet connection and try again.");
 const doc=new JsPDF({unit:"mm",format:"a4"}),navy=[15,31,61],gold=[245,166,35],muted=[100,100,100];
 try{doc.addImage(await imageDataUrl("/logo.jpg"),"JPEG",18,12,28,28)}catch(_){}
 doc.setTextColor(...navy);doc.setFont("helvetica","bold");doc.setFontSize(17);doc.text(school.name,105,19,{align:"center"});doc.setFontSize(9);doc.setFont("helvetica","normal");doc.setTextColor(...muted);doc.text(school.address,105,26,{align:"center"});doc.text("Tel: "+school.phone+"  |  Email: "+school.email,105,32,{align:"center"});doc.setTextColor(...gold);doc.setFont("helvetica","bold");doc.text(school.motto,105,38,{align:"center"});doc.setDrawColor(...gold);doc.setLineWidth(.8);doc.line(18,44,192,44);
 doc.setTextColor(...navy);doc.setFont("helvetica","bold");doc.setFontSize(14);doc.text("ADMISSION APPLICATION FORM",105,55,{align:"center"});doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(...muted);doc.text("Blank official form — complete and submit online or print for manual completion.",105,61,{align:"center"});
 let y=73;doc.setFillColor(245,247,250);doc.roundedRect(18,y-6,174,10,2,2,"F");doc.setTextColor(...navy);doc.setFont("helvetica","bold");doc.text("Applicant Information",23,y);y+=15;
 const rows=["Applicant Full Name","Date of Birth","Gender","Class Applying For","Parent / Guardian Full Name","Parent Email","Parent / Guardian Phone","Residential Address"];
 doc.setFontSize(10);rows.forEach(label=>{doc.setFont("helvetica","bold");doc.setTextColor(...navy);doc.text(label,23,y);doc.setDrawColor(160,160,160);doc.line(75,y+1,188,y+1);y+=12;if(y>258){doc.addPage();y=22}});
 doc.setDrawColor(210,210,210);doc.line(18,y+4,192,y+4);doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(...muted);doc.text("Declaration: I certify that the information supplied is complete and accurate.",23,y+14);doc.setFontSize(8);doc.text(school.name+" • "+school.address,105,285,{align:"center"});return doc;
}
async function downloadEmptyForm(){
 try{const doc=await buildEmptyPdf();doc.save("d-blossom-empty-admission-form.pdf");notice.className="notice success";notice.textContent="The empty admission form has been downloaded."}catch(error){notice.className="notice danger";notice.textContent=error.message||"The empty form could not be generated."}
}
form?.addEventListener("submit",async e=>{
 e.preventDefault();notice.className="notice";notice.textContent="Submitting application…";const submit=form.querySelector("button[type=submit]");submit.disabled=true;
 try{const data=Object.fromEntries(new FormData(form));const response=await fetch("/api/admissions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});const payload=await response.json().catch(()=>({}));if(!response.ok)throw Error(payload.error||"Application could not be submitted.");submittedApplication={...data,...(payload.data||{})};notice.className="notice success";notice.textContent="Application submitted successfully. Application number: "+(payload.data?.application_number||"generated")+". Use Check Admission Status later with the admission key issued by the school.";form.reset()}catch(error){notice.className="notice danger";notice.textContent=error.message||"Application could not be submitted."}finally{submit.disabled=false}
});
document.querySelector("#download-empty-admission-form")?.addEventListener("click",downloadEmptyForm);