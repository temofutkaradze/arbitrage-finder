import {createServer} from "node:http";
// Tunnel port 3001 only. All application pages and other APIs remain inaccessible.
const path="/api/ebay/account-deletion";
const server=createServer(async(req,res)=>{
 res.setHeader("Cache-Control","no-store");
 try{
  const url=new URL(req.url??"/","http://127.0.0.1:3001");
  if(url.pathname!==path||!["GET","POST"].includes(req.method??"")){res.writeHead(404).end();return;}
  const declared=Number(req.headers["content-length"]??0);
  if(declared>65536){res.writeHead(413).end();return;}
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413).end();return;}chunks.push(Buffer.from(chunk));}
  const headers:Record<string,string>={};
  for(const name of ["content-type","x-ebay-signature"]){const value=req.headers[name];if(typeof value==="string")headers[name]=value;}
  const result=await fetch(`http://127.0.0.1:3000${path}${url.search}`,{method:req.method,headers,body:req.method==="POST"?Buffer.concat(chunks):undefined,redirect:"error",signal:AbortSignal.timeout(25000)});
  res.setHeader("Content-Type",result.headers.get("content-type")??"application/json");
  res.writeHead(result.status);res.end(await result.text());
 }catch{if(!res.headersSent)res.writeHead(503);res.end();}
});
server.requestTimeout=30000;server.headersTimeout=10000;
server.on("error",()=>{console.error("Notification relay could not start. Check whether port 3001 is already in use.");process.exitCode=1;});
server.listen(3001,"127.0.0.1",()=>console.log("eBay notification relay ready on loopback port 3001. Tunnel this port only; keep the app running on port 3000."));
process.once("SIGINT",()=>server.close());process.once("SIGTERM",()=>server.close());
