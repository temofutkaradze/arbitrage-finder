"use server";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/db/prisma";
import {checkMutationOrigin} from "@/lib/auth/server";
import {verifyPassword,newSession,sessionId,SESSION_COOKIE,SESSION_MS} from "@/lib/auth/core";
export async function signIn(_:string,form:FormData){
 void _;
 let accepted=false;
 try{
  const config=await checkMutationOrigin();const password=String(form.get("password")??"");
  if(!password||password.length>256)return "Unable to sign in. Check credentials or try later.";
  const session=await prisma.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340928)`;
   const now=new Date(),old=await tx.ownerLoginState.findUnique({where:{id:"owner"}});
   if(old?.lockedUntil&&old.lockedUntil>now)return null;
   const recent=old&&now.getTime()-old.windowStartedAt.getTime()<900000;
   if(!verifyPassword(password,config.hash)){
    const failures=(recent?old.failures:0)+1;
    await tx.ownerLoginState.upsert({where:{id:"owner"},create:{id:"owner",failures,windowStartedAt:now,lockedUntil:failures>=5?new Date(now.getTime()+900000):null},update:{failures,windowStartedAt:recent?old.windowStartedAt:now,lockedUntil:failures>=5?new Date(now.getTime()+900000):null}});return null;
   }
   const created=newSession();await tx.ownerSession.deleteMany({where:{expiresAt:{lte:now}}});
   await tx.ownerSession.create({data:{id:created.id,passwordVersion:config.version,expiresAt:created.expiresAt}});
   await tx.ownerLoginState.upsert({where:{id:"owner"},create:{id:"owner",failures:0,windowStartedAt:now},update:{failures:0,lockedUntil:null,windowStartedAt:now}});return created;
  });
  if(session){(await cookies()).set(SESSION_COOKIE,session.token,{httpOnly:true,sameSite:"strict",secure:config.secure,path:"/",maxAge:SESSION_MS/1000});accepted=true;}
 }catch{return "Sign-in unavailable. Check owner configuration or database readiness.";}
 if(accepted)redirect("/");return "Unable to sign in. Check credentials or try later.";
}
export async function signOut(){
 await checkMutationOrigin();const store=await cookies(),token=store.get(SESSION_COOKIE)?.value;
 if(token&&/^[a-f0-9]{64}$/.test(token))await prisma.ownerSession.deleteMany({where:{id:sessionId(token)}});
 store.delete(SESSION_COOKIE);redirect("/login");
}
