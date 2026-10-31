import {config} from "dotenv";
config({path:".env.local",quiet:true});
config({path:".env",quiet:true});
import {createConnection} from "node:net";
import {setTimeout} from "node:timers/promises";

class LauncherError extends Error {}

async function main(){
 if(process.argv.includes("--wait")){
  for(let i=0;i<60;i++){
   try{const response=await fetch("http://127.0.0.1:3000/api/health",{signal:AbortSignal.timeout(2000)});if(response.ok)return;}catch{}
   await setTimeout(1000);
  }
  throw new LauncherError("The website did not become ready. Check the Website window; the worker was not started.");
 }
 if(Number(process.versions.node.split('.')[0])<24)throw new LauncherError("Node.js 24 or newer is required.");
 const occupied=await new Promise<boolean>(resolve=>{
  const socket=createConnection({host:"127.0.0.1",port:3000});
  socket.setTimeout(1000);socket.once("connect",()=>{socket.destroy();resolve(true);});
  socket.once("error",()=>{socket.destroy();resolve(false);});socket.once("timeout",()=>{socket.destroy();resolve(false);});
 });
 if(occupied)throw new LauncherError("Port 3000 is already in use. Use the running app or close its window before starting again.");
 const {configuredAuth}=await import("../src/lib/auth/core");
 const auth=configuredAuth();
 if(auth.origin!=="http://127.0.0.1:3000")throw new LauncherError("APP_ORIGIN must match http://127.0.0.1:3000 for this local launcher.");
 const {prisma}=await import("../src/lib/db/prisma");
 try{
  await prisma.$queryRaw`SELECT 1`;
  const research=process.env.RESEARCH_JOBS_ENABLED==="true";
  if(research)await prisma.researchJob.count();
  console.log("PostgreSQL connection and local configuration are ready.");
  if(!research){console.log("Research worker disabled. Set RESEARCH_JOBS_ENABLED=true after applying its migration to start it with the website.");process.exitCode=2;}
  console.log("This launcher starts the website and enabled research queue only. Scheduled discovery uses its separate discovery:worker command.");
 }finally{await prisma.$disconnect();}
}
main().catch(error=>{
 console.error(error instanceof LauncherError ? error.message : "Startup check failed: verify Node.js 24+, port 3000, APP_ORIGIN, owner authentication and the PostgreSQL service. If research is enabled, apply its approved migration first. Credentials are not displayed.");
 process.exitCode=1;
});
