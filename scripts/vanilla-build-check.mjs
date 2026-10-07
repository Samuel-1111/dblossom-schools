import{existsSync,readFileSync,readdirSync}from"node:fs";import{join}from"node:path";
const required=[
"index.html","css/style.css","css/responsive.css",
"js/app.js","js/auth.js","js/supabase.js","js/admin.js","js/teacher.js","js/student.js","js/parent.js","js/results.js","js/payments.js","js/admissions.js",
"pages/about.html","pages/academics.html","pages/gallery.html","pages/events.html","pages/contact.html","pages/admissions.html",
"pages/student-login.html","pages/teacher-login.html","pages/parent-login.html","pages/admin-login.html",
"student-dashboard.html","teacher-dashboard.html","parent-dashboard.html","admin-dashboard.html",
"netlify/functions/config.js","netlify/functions/portal-login.js","netlify/functions/dashboard-data.js","netlify/functions/admissions.js","netlify/functions/paystack-init.js","netlify/functions/paystack-verify.js","netlify/functions/admin-operations.js","netlify/functions/teacher-records.js","netlify/functions/manus-storage.js"
];
const missing=required.filter(x=>!existsSync(x));
if(missing.length){console.error("Missing required vanilla website files:",missing.join(", "));process.exit(1)}
const read=p=>readFileSync(p,"utf8");
const index=read("index.html");
for(const marker of ['href="/css/style.css"','href="/css/responsive.css"','src="/js/app.js"'])if(!index.includes(marker)){console.error("index.html is missing "+marker);process.exit(1)}
const badDeployPatterns=[/from\s+["']react/i,/next\//i,/nextjs/i,/tailwindcss/i,/@tailwind/i,/\.tsx\b/i];
const deployFiles=["index.html",...readdirSync("pages").filter(x=>x.endsWith(".html")).map(x=>"pages/"+x),...readdirSync("js").filter(x=>x.endsWith(".js")).map(x=>"js/"+x)];
for(const p of deployFiles){const s=read(p);for(const re of badDeployPatterns)if(re.test(s)){console.error("Framework reference found in deployable vanilla file:",p,re);process.exit(1)}}
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const p=join(dir,entry.name);if(entry.isDirectory()&&!["node_modules",".git"].includes(entry.name))walk(p);else if(entry.isFile()&&p.endsWith(".js")&&!p.startsWith("netlify/functions/")){const s=read(p);if(/<script[^>]*>|<\/script>/i.test(s)){console.error("Unexpected HTML marker in JS:",p);process.exit(1)}}}}
walk(".");
console.log("D'Blossom vanilla website structure check passed:",required.length,"required files present.");