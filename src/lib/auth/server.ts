import {cookies,headers} from "next/headers";
import {redirect} from "next/navigation";
import {prisma} from "../db/prisma";
import {configuredAuth,sessionId,SESSION_COOKIE} from "./core";
export async function checkMutationOrigin(){
 const config=configuredAuth();const origin=(await headers()).get("origin");
 if(origin!==config.origin)throw new Error("Request origin is not allowed.");return config;
}
export async function requireOwner(mutation=true){
 const config=mutation?await checkMutationOrigin():configuredAuth();
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 if(!token||!/^[a-f0-9]{64}$/.test(token))redirect("/login");
 const session=await prisma.ownerSession.findUnique({where:{id:sessionId(token)}});
 if(!session||session.expiresAt<=new Date()||session.passwordVersion!==config.version)redirect("/login");
}
