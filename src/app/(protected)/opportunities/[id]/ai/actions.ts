"use server";
import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runResearch } from "@/lib/ai/service";
export async function requestResearch(_:string,form:FormData) {
 await requireOwner();
 const parsed=z.object({id:z.coerce.number().int().positive().max(2147483647),hash:z.string().regex(/^[a-f0-9]{64}$/),consent:z.literal("on")}).safeParse(Object.fromEntries(form));
 if(!parsed.success)return "დაადასტურე პაკეტის გაგზავნა და API-ის შესაძლო ხარჯი.";
 let message:string;
 try{message=await runResearch(parsed.data.id,parsed.data.hash);}catch{return "მცდელობა ვერ დასრულდა. განაახლე გვერდი და შეამოწმე ანგარიშის მდგომარეობა ხელახლა გაშვებამდე.";}
 revalidatePath(`/opportunities/${parsed.data.id}/ai`);return message;
}
