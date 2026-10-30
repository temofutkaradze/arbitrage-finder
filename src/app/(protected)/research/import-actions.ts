"use server";
import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { importPendingOffers } from "@/lib/providers/import-offers";
export async function importOfferBatch(_:string,data:FormData){
 await requireOwner();
 const input=z.object({opportunityId:z.coerce.number().int().positive().max(2147483647),marketId:z.coerce.number().int().positive().max(2147483647),version:z.coerce.number().int().nonnegative(),batch:z.string().max(200000),consent:z.literal("on")}).safeParse(Object.fromEntries(data));
 if(!input.success)return "გადაამოწმე პაკეტი და დაადასტურე წყაროს გამოყენების უფლება.";
 try{const r=await importPendingOffers(input.data.opportunityId,input.data.marketId,input.data.version,input.data.batch);revalidatePath("/research");return `შესადარებლად: ${r.created} ახალი, ${r.updated} განახლებული, ${r.unchanged} უცვლელი. არც ერთი არ მონიშნულა შესადარებლად ავტომატურად.`;}
 catch{return "არ შენახულა. გადაამოწმე JSON, წყაროს თარიღები (მაქს. 24 საათი), ქვეყანა/ვალუტა და ბაზრის ვერსია. იმავე URL/თარიღის განსხვავებული მონაცემი ან ძველზე დაბრუნება დაუშვებელია.";}
}
