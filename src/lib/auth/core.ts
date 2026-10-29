import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
export const SESSION_COOKIE="arbitrage_owner";
export const SESSION_MS=8*3600000;
export function hashPassword(password:string){
 const salt=randomBytes(16).toString("hex");
 return `scrypt:${salt}:${scryptSync(password,salt,64,{N:32768,maxmem:67108864}).toString("hex")}`;
}
export function configuredAuth(){
 const hash=process.env.APP_PASSWORD_HASH??"",address=process.env.APP_ORIGIN??"";
 if(!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash))throw new Error("Owner sign-in is not configured.");
 let origin:URL;try{origin=new URL(address);}catch{throw new Error("Owner origin is not configured.");}
 if(origin.username||origin.password||origin.search||origin.hash||origin.pathname!=="/"||!(origin.protocol==="https:"||(origin.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(origin.hostname))))throw new Error("Owner origin must be HTTPS, or local HTTP for development.");
 return {hash,origin:origin.origin,secure:origin.protocol==="https:",version:createHash("sha256").update(hash).digest("hex")};
}
export function verifyPassword(password:string,hash:string){
 if(password.length>256||!/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash))return false;
 const [,salt,expected]=hash.split(":");
 return timingSafeEqual(scryptSync(password,salt,64,{N:32768,maxmem:67108864}),Buffer.from(expected,"hex"));
}
export function sessionId(token:string){return createHash("sha256").update(token).digest("hex");}
export function newSession(){const token=randomBytes(32).toString("hex");return{token,id:sessionId(token),expiresAt:new Date(Date.now()+SESSION_MS)};}
