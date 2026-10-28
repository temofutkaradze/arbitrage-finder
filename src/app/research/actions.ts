"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { competitorSchema } from "@/lib/research/competitors";
export async function recordCompetitor(_:string,form:FormData){
 const result=competitorSchema.safeParse(Object.fromEntries(form));
 if(!result.success)return "Check the fields: integer minor-unit prices, source URL, comparison notes and valid UTC dates are required. Unknown shipping must be blank.";
 try {
  await prisma.$transaction(async tx=>{
   const market=await tx.market.findUniqueOrThrow({where:{id:result.data.marketId}});
   if(market.currency!==result.data.currency)throw new Error("Currency mismatch");
   await tx.competitorObservation.create({data:result.data});
  });
 }catch{return "Not saved. Match the market currency and check duplicate source/date observations or database availability.";}
 revalidatePath("/", "layout");return "Competitor observation saved. Displayed prices do not prove sales or demand.";
}
export async function resolveEvidence(_:string,form:FormData){
 const result=z.object({id:z.coerce.number().int().positive(),note:z.string().trim().min(20).max(2000)}).safeParse({id:form.get("id"),note:form.get("note")});
 if(!result.success)return "Explain the resolution or correction in at least 20 characters.";
 try{const changed=await prisma.evidence.updateMany({where:{id:result.data.id,resolvedAt:null},data:{resolvedAt:new Date(),resolutionNote:result.data.note}});if(!changed.count)return "Record is already retired or unavailable; its original explanation was preserved.";}catch{return "Record not changed. Check database availability.";}
 revalidatePath("/", "layout");return "Record retired with its explanation. It no longer supports readiness or blocks it; add current evidence separately.";
}
