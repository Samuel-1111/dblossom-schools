const form=document.querySelector("#admission-form"),notice=document.querySelector("#admission-notice");
let submittedApplication=null;

const school={
 name:"D'Blossom Model Private Schools",
 motto:"Indomino Confidimus (In God We Trust)",
 address:"Divine Blossom Street, Agbogun Dam View, Obada Oko, Abeokuta, Ogun State, Nigeria",
 phone:"08123447514, 08037151183",
 email:"divineblossom999@gmail.com"
};

function currentApplication(){
 const data=Object.fromEntries(new FormData(form));
 return submittedApplication ? {...data,...submittedApplication} : data;
}

async function imageDataUrl(url){
 const response=await fetch(url);
 if(!response.ok)throw new Error("School logo could not be loaded.");
 const blob=await response.blob();
 return await new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(reader.result);
   reader.onerror=reject;
   reader.readAsDataURL(blob);
 });
}

function cleanFileName(value){
 return String(value||"application").replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"application";
}

async function buildPdf(){
 const JsPDF=window.jspdf?.jsPDF;
 if(!JsPDF)throw new Error("PDF generator is unavailable. Please check your internet connection and try again.");

 const data=currentApplication();
 if(!data.applicant_name)throw new Error("Enter the applicant's full name before printing or downloading the form.");

 const doc=new JsPDF({unit:"mm",format:"a4"});
 const navy=[15,31,61],gold=[245,166,35],dark=[45,45,45],muted=[100,100,100];

 try{
   const logo=await imageDataUrl("/logo.jpg");
   doc.addImage(logo,"JPEG",18,12,28,28);
 }catch(_){}

 doc.setTextColor(...navy);
 doc.setFont("helvetica","bold");
 doc.setFontSize(17);
 doc.text(school.name,105,19,{align:"center"});
 doc.setFontSize(9);
 doc.setFont("helvetica","normal");
 doc.setTextColor(...muted);
 doc.text(school.address,105,26,{align:"center"});
 doc.text("Tel: "+school.phone+"  |  Email: "+school.email,105,32,{align:"center"});
 doc.setTextColor(...gold);
 doc.setFont("helvetica","bold");
 doc.text(school.motto,105,38,{align:"center"});
 doc.setDrawColor(...gold);
 doc.setLineWidth(0.8);
 doc.line(18,44,192,44);

 doc.setTextColor(...navy);
 doc.setFont("helvetica","bold");
 doc.setFontSize(14);
 doc.text("ADMISSION APPLICATION FORM",105,55,{align:"center"});
 doc.setFont("helvetica","normal");
 doc.setFontSize(9);
 doc.setTextColor(...muted);
 doc.text("Official copy for the applicant/parent or guardian",105,61,{align:"center"});

 let y=73;
 doc.setFillColor(245,247,250);
 doc.roundedRect(18,y-6,174,10,2,2,"F");
 doc.setTextColor(...navy);
 doc.setFont("helvetica","bold");
 doc.text("Applicant Information",23,y);
 y+=15;

 const rows=[
  ["Application Number",data.application_number||"Not yet submitted"],
  ["Applicant Full Name",data.applicant_name],
  ["Date of Birth",data.date_of_birth||"Not provided"],
  ["Gender",data.gender||"Not provided"],
  ["Class Applying For",data.class_applied||"Not provided"],
  ["Parent / Guardian",data.parent_name],
  ["Parent Email",data.parent_email||"Not provided"],
  ["Parent / Guardian Phone",data.parent_phone||"Not provided"],
  ["Residential Address",data.address||"Not provided"]
 ];

 doc.setFontSize(10);
 rows.forEach(([label,value])=>{
   doc.setFont("helvetica","bold");
   doc.setTextColor(...navy);
   doc.text(label,23,y);
   doc.setFont("helvetica","normal");
   doc.setTextColor(...dark);
   const lines=doc.splitTextToSize(String(value),112);
   doc.text(lines,75,y);
   y+=Math.max(8,lines.length*5.5)+2;
   if(y>258){
     doc.addPage();
     y=22;
   }
 });

 y+=6;
 if(y>255){doc.addPage();y=22;}
 doc.setDrawColor(210,210,210);
 doc.line(18,y,192,y);
 y+=9;
 doc.setFontSize(9);
 doc.setTextColor(...muted);
 doc.text("Declaration: The information provided on this form is supplied for admission processing.",23,y);
 y+=6;
 doc.text("Please retain this copy for your records and present it to the school when requested.",23,y);

 doc.setFontSize(8);
 doc.setTextColor(...muted);
 doc.text(school.name+" • "+school.address,105,285,{align:"center"});
 doc.text("Generated on "+new Date().toLocaleString(),105,290,{align:"center"});

 return doc;
}

async function downloadPdf(){
 try{
   const doc=await buildPdf();
   const applicant=cleanFileName(currentApplication().applicant_name);
   doc.save("d-blossom-admission-form-"+applicant+".pdf");
   notice.className="notice success";
   notice.textContent="Admission application form downloaded successfully as PDF.";
 }catch(error){
   notice.className="notice danger";
   notice.textContent=error.message||"The PDF could not be generated.";
 }
}

form?.addEventListener("submit",async e=>{
 e.preventDefault();
 notice.className="notice";
 notice.textContent="Submitting application…";
 const submit=form.querySelector("button[type=submit]");
 submit.disabled=true;
 try{
   const data=Object.fromEntries(new FormData(form));
   const response=await fetch("/api/admissions",{
     method:"POST",
     headers:{"content-type":"application/json"},
     body:JSON.stringify(data)
   });
   const payload=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(payload.error||"Application could not be submitted.");

   submittedApplication={...data,...(payload.data||{})};
   notice.className="notice success";
   notice.textContent="Application submitted successfully. Application number: "+(payload.data?.application_number||"generated")+". You can now print or download the form.";
 }catch(error){
   notice.className="notice danger";
   notice.textContent=error.message||"Application could not be submitted.";
 }finally{
   submit.disabled=false;
 }
});

document.querySelector("#download-admission-pdf")?.addEventListener("click",downloadPdf);

document.querySelector("#print-admission-form")?.addEventListener("click",async()=>{
 try{
   const doc=await buildPdf();
   const applicant=cleanFileName(currentApplication().applicant_name);
   const blobUrl=doc.output("bloburl");
   const printWindow=window.open(blobUrl,"_blank");
   if(!printWindow)throw new Error("Please allow pop-ups to print the application form.");
   notice.className="notice success";
   notice.textContent="Printable application form opened. Use your browser's Print option to print or Save as PDF.";
   void applicant;
 }catch(error){
   notice.className="notice danger";
   notice.textContent=error.message||"The form could not be prepared for printing.";
 }
});
