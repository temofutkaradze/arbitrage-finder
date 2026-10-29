import "dotenv/config";
import {config} from "dotenv";
import {prisma} from "../src/lib/db/prisma";
import {newSession,configuredAuth,SESSION_COOKIE} from "../src/lib/auth/core";
config({path:".env.local",quiet:true});
let session:ReturnType<typeof newSession>|undefined;
export async function authenticatedFetch(input:string|URL,init?:RequestInit){
 const url=new URL(String(input));if(url.origin!=="http://127.0.0.1:3000")throw new Error("Test auth only supports the local test origin");
 if(!session){session=newSession();await prisma.ownerSession.create({data:{id:session.id,expiresAt:session.expiresAt,passwordVersion:configuredAuth().version}});}
 const headers=new Headers(init?.headers);headers.set("Cookie",`${SESSION_COOKIE}=${session.token}`);
 return globalThis.fetch(input,{...init,headers});
}
export async function cleanupTestSessions(){if(session)await prisma.ownerSession.deleteMany({where:{id:session.id}});}
