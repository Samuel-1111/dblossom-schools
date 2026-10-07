const {handler}=require("../../netlify/functions/manus-storage");
const wrap=require("../_adapter");
module.exports=wrap(handler,{path:(req,event)=>{const p=event.queryStringParameters.key||((req.url||"").split("/api/manus-storage/")[1]||"").split("?")[0];return "/.netlify/functions/manus-storage/"+decodeURIComponent(p)}});