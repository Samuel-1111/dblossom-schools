const form=document.querySelector("#admission-form"),notice=document.querySelector("#admission-notice");form?.addEventListener("submit",async e=>{e.preventDefault();notice.className="notice";notice.textContent="Submitting application…";const submit=form.querySelector("button[type=submit]");submit.disabled=true;try{const data=Object.fromEntries(new FormData(form));const response=await fetch("/api/admissions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});const payload=await response.json().catch(()=>({}));if(!response.ok)throw Error(payload.error||"Application could not be submitted.");notice.textContent="Application submitted successfully. Application number: "+(payload.data?.application_number||"generated");form.reset()}catch(error){notice.className="notice danger";notice.textContent=error.message||"Application could not be submitted."}finally{submit.disabled=false}});
const downloadButton=document.querySelector("#download-admission-pdf");
downloadButton?.addEventListener("click",()=>{
 const JsPDF=window.jspdf?.jsPDF;
 if(!JsPDF){notice.className="notice danger";notice.textContent="PDF generator is unavailable. Please check your internet connection and try again.";return;}
 const data=Object.fromEntries(new FormData(form));
 const doc=new JsPDF();
 const navy=[15,31,61],gold=[245,166,35];
 doc.setTextColor(...navy);doc.setFontSize(18);doc.text("D'Blossom Model Private Schools",105,22,{align:"center"});
 doc.setFontSize(11);doc.setTextColor(80,80,80);doc.text("ONLINE ADMISSION APPLICATION FORM",105,31,{align:"center"});
 doc.setDrawColor(...gold);doc.line(20,37,190,37);
 const rows=[["Applicant Name",data.applicant_name],["Date of Birth",data.date_of_birth],["Gender",data.gender],["Class Applying For",data.class_applied],["Parent/Guardian",data.parent_name],["Parent Email",data.parent_email],["Parent Phone",data.parent_phone],["Address",data.address]];
 let y=52;doc.setFontSize(11);
 rows.forEach(([label,value])=>{doc.setTextColor(...navy);doc.setFont(undefined,"bold");doc.text(label+":",20,y);doc.setFont(undefined,"normal");doc.setTextColor(60,60,60);const lines=doc.splitTextToSize(String(value||"Not provided"),130);doc.text(lines,60,y);y+=Math.max(9,lines.length*6)+4;if(y>270){doc.addPage();y=20;}});
 doc.setFontSize(9);doc.setTextColor(110,110,110);doc.text("D'Blossom Model Private Schools • Obada Oko, Abeokuta, Ogun State",105,285,{align:"center"});
 const applicant=(data.applicant_name||"applicant").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"applicant";
 doc.save("d-blossom-admission-form-"+applicant+".pdf");
 notice.className="notice success";notice.textContent="Admission form PDF downloaded.";
});