"use server";
import {requireOwner} from "@/lib/auth/server";
import {revalidatePath} from "next/cache";
import {enqueueResearch,stopResearch} from "@/lib/automation/jobs";
export async function enqueue(_:string,data:FormData){
 await requireOwner();
 try{
  await enqueueResearch({id:String(data.get("requestId")),ids:data.getAll("listingId").map(Number),confirmed:data.get("confirmed")==="on",...(data.get("marketId")?{marketId:Number(data.get("marketId"))}:{})});
  revalidatePath("/automation/jobs");return "დავალება შენახულია. შესრულებისთვის worker უნდა მუშაობდეს.";
 }catch{return "დავალება ვერ დაემატა. განაახლე სია: შეიძლება აქტიური დავალება უკვე არსებობდეს. გადაამოწმე 1–3 კანდიდატი, ბაზრის შეფასება და კონფიგურაცია.";}
}
export async function stop(_:string,data:FormData){
 await requireOwner();
 try{await stopResearch(String(data.get("id")));revalidatePath("/automation/jobs");return "შეჩერება მოთხოვნილია. მიმდინარე API მოთხოვნა შეიძლება დასრულდეს.";}
 catch{return "შეჩერება ვერ დადასტურდა. განაახლე დავალებების სია.";}
}
