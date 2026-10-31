import {challengeResponse,deletionSchema,notificationConfig,signatureHeader,verifyNotification} from "@/lib/ebay-notifications/protocol";
import {notificationKey} from "@/lib/ebay-notifications/keys";
import {deleteAccount} from "@/lib/ebay-notifications/deletion";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"no-store"};
function failure(status:number,stage:string){
 console.warn(`eBay notification failed: ${stage}`);
 return Response.json({error:stage},{status,headers});
}
export async function GET(request:Request){
 try{
  const c=notificationConfig(),query=new URL(request.url).searchParams;
  if(query.getAll("challenge_code").length!==1)return new Response(null,{status:400,headers});
  return Response.json({challengeResponse:challengeResponse(query.get("challenge_code")!,c.token,c.endpoint)},{headers});
 }catch{return new Response(null,{status:503,headers});}
}
export async function POST(request:Request){
 try{notificationConfig();}catch{return failure(503,"configuration");}
 let payload:unknown;
 let stage="payload";
 try{
  if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))return new Response(null,{status:415,headers});
  const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400,headers});
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();return new Response(null,{status:413,headers});}chunks.push(value);}
  payload=JSON.parse(Buffer.concat(chunks).toString("utf8"));
  deletionSchema.parse(payload);
  const signature=request.headers.get("x-ebay-signature")??"";
  let kid:string;try{kid=signatureHeader(signature).kid;}catch{return new Response(null,{status:412,headers});}
  stage="public_key_lookup";
  const key=await notificationKey(kid);
  stage="signature_verification";
  if(!verifyNotification(payload,signature,key))return new Response(null,{status:412,headers});
 }catch{return failure(stage==="payload"?400:503,stage);}
 try{await deleteAccount(payload);return new Response(null,{status:204,headers});}
 catch{return failure(503,"database_deletion");}
}
