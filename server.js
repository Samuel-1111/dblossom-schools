const http=require("http");
const fs=require("fs");
const path=require("path");
const url=require("url");

const ROOT=__dirname;
const MIME={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".png":"image/png",
  ".webp":"image/webp",
  ".svg":"image/svg+xml",
  ".ico":"image/x-icon",
  ".txt":"text/plain; charset=utf-8"
};

function loadEnv(){
  const file=path.join(ROOT,".env");
  if(!fs.existsSync(file))return;
  for(const line of fs.readFileSync(file,"utf8").split(/\r?\n/)){
    const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if(!m||process.env[m[1]])continue;
    process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,"");
  }
}
loadEnv();

function send(res,status,body,type="text/plain; charset=utf-8"){
  res.writeHead(status,{"content-type":type,"cache-control":"no-store"});
  res.end(body);
}

function body(req){
  return new Promise((resolve,reject)=>{
    let data="";
    req.on("data",chunk=>{
      data+=chunk;
      if(data.length>2*1024*1024){
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end",()=>resolve(data));
    req.on("error",reject);
  });
}

async function api(req,res,pathname,query){
  const name=pathname.slice("/api/".length).replace(/\/$/,"");
  if(!/^[A-Za-z0-9_-]+$/.test(name))return send(res,404,"Not found");

  const file=path.join(ROOT,"netlify","functions",name+".js");
  if(!fs.existsSync(file))return send(res,404,JSON.stringify({error:"API route not found: "+name}),"application/json");

  try{
    const mod=require(file);
    const handler=mod.handler;
    if(typeof handler!=="function")throw new Error("API handler missing");

    const raw=await body(req);
    const event={
      httpMethod:req.method,
      headers:req.headers,
      body:raw||null,
      queryStringParameters:Object.fromEntries(query.entries()),
      path:pathname
    };

    const out=await handler(event,{});
    const headers={...(out?.headers||{})};
    if(!headers["content-type"]&&!headers["Content-Type"])
      headers["content-type"]="application/json; charset=utf-8";

    res.writeHead(out?.statusCode||200,headers);
    res.end(out?.body??"");
  }catch(e){
    console.error("Local API error:",pathname,e);
    send(res,500,JSON.stringify({error:"Local API error. Check your .env configuration and terminal output."}),"application/json");
  }
}

function isBlockedStaticPath(pathname){
  const normalized=pathname.replace(/^\/+|\/+$/g,"");
  if(!normalized)return false;
  const first=normalized.split("/")[0];
  return first.startsWith(".") ||
    first==="netlify" ||
    first==="node_modules" ||
    first==="server.js" ||
    first==="package.json" ||
    first==="package-lock.json";
}

function staticFile(req,res,pathname){
  if(isBlockedStaticPath(pathname))return send(res,404,"Not found");

  let p=pathname;
  if(p==="/")p="/index.html";
  if(p==="/admin"||p==="/admin/")p="/admin/index.html";

  const file=path.normalize(path.join(ROOT,p));
  if(!file.startsWith(ROOT+path.sep)&&file!==ROOT)return send(res,403,"Forbidden");

  fs.stat(file,(err,st)=>{
    if(!err&&st.isFile()){
      const ext=path.extname(file).toLowerCase();
      res.writeHead(200,{"content-type":MIME[ext]||"application/octet-stream"});
      fs.createReadStream(file).pipe(res);
      return;
    }
    send(res,404,"Page not found");
  });
}

const server=http.createServer(async(req,res)=>{
  const parsed=url.parse(req.url||"/",true);
  const pathname=parsed.pathname||"/";

  if(pathname.startsWith("/api/"))
    return api(req,res,pathname,new URLSearchParams(parsed.query));

  return staticFile(req,res,pathname);
});

const parsedPort=Number(process.env.PORT);\nconst port=Number.isInteger(parsedPort)&&parsedPort>0&&parsedPort<65536?parsedPort:3000;
server.listen(port,()=>{
  console.log("D’Blossom local server: http://localhost:"+port);
  console.log("Connected services: Supabase"+(process.env.PAYSTACK_SECRET_KEY?" + Paystack":""));
  console.log("Local testing mode — no deployment service is required.");
});
