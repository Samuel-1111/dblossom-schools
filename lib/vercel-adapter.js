function eventFromRequest(req){
  const headers={};
  for(const [k,v] of Object.entries(req.headers||{})){if(v!=null)headers[k.toLowerCase()]=Array.isArray(v)?v.join(","):String(v)}
  const url=new URL(req.url||"/", "http://localhost");
  let body=req.body;
  if(body!==undefined&&typeof body!=="string")body=JSON.stringify(body);
  return {httpMethod:req.method||"GET",headers,body,queryStringParameters:Object.fromEntries(url.searchParams.entries()),path:url.pathname};
}
module.exports=function wrap(handler, options={}){return async function(req,res){try{const event=eventFromRequest(req);if(options.path)event.path=options.path(req,event);const out=await handler(event,{});const status=out?.statusCode||200;if(out?.headers)for(const[k,v]of Object.entries(out.headers))res.setHeader(k,v);res.status(status);if(out?.isBase64Encoded)return res.send(Buffer.from(out.body||"","base64"));return res.send(out?.body??"")}catch(err){console.error(err);return res.status(500).json({error:"Internal server error."})}}};