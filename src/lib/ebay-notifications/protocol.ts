import {createHash,createHmac,createPublicKey,verify} from "node:crypto";
import {z} from "zod";
export function notificationConfig(){
 const endpoint=process.env.EBAY_DELETION_ENDPOINT;
 const token=process.env.EBAY_DELETION_VERIFICATION_TOKEN;
 const secret=process.env.EBAY_DELETION_HASH_SECRET;
 if(!endpoint||!token||!secret||!/^[a-zA-Z0-9_-]{32,80}$/.test(token)||secret.length<32)throw new Error("Notification configuration unavailable");
 const u=new URL(endpoint);
 if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||u.pathname!=="/api/ebay/account-deletion"||u.hostname==="localhost"||/^[\d.]+$/.test(u.hostname))throw new Error("Public HTTPS endpoint required");
 return {endpoint,token,secret};
}
export function challengeResponse(challenge:string,token:string,endpoint:string){
 if(!/^[a-zA-Z0-9_-]{1,512}$/.test(challenge))throw new Error("Invalid challenge");
 return createHash("sha256").update(challenge).update(token).update(endpoint).digest("hex");
}
export const deletionSchema=z.object({metadata:z.object({topic:z.literal("MARKETPLACE_ACCOUNT_DELETION"),schemaVersion:z.literal("1.0")}),notification:z.object({notificationId:z.string().min(1).max(200),data:z.object({username:z.string().min(1).max(200).optional(),userId:z.string().min(1).max(200),eiasToken:z.string().max(4000).optional()})})});
export function identityHash(value:string,secret:string){return createHmac("sha256",secret).update(value.toLowerCase()).digest("hex");}
export function signatureHeader(value:string){
 if(value.length>4096||!value||!/^[A-Za-z0-9+/]+={0,2}$/.test(value))throw new Error("Invalid signature");
 return z.object({kid:z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/),signature:z.string().min(1).max(1024)}).parse(JSON.parse(Buffer.from(value,"base64").toString("utf8")));
}
export function verifyNotification(payload:unknown,signature:string,key:string){
 const header=signatureHeader(signature),publicKey=createPublicKey(key);
 // eBay's official event-notification-nodejs-sdk uses SHA-1 with an EC public key
 // over JSON.stringify(message), not the SHA-256 challenge protocol.
 if(publicKey.asymmetricKeyType!=="ec")return false;
 return verify("sha1",Buffer.from(JSON.stringify(payload)),publicKey,Buffer.from(header.signature,"base64"));
}

export function isEbayUrl(value:string){
 try{const u=new URL(value);return u.protocol==="https:"&&/(^|\.)ebay\.(com|co\.uk|com\.au|ca|de|fr|it|es)$/.test(u.hostname);}catch{return false;}
}
