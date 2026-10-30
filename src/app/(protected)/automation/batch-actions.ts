"use server";
import {requireOwner} from "@/lib/auth/server";
import {prisma} from "@/lib/db/prisma";
import {batchIds} from "@/lib/automation/research-batch";
export async function prepareResearchBatch(input:unknown){
 await requireOwner();
 const parsed=batchIds.safeParse(input);
 if(!parsed.success)return {ok:false as const,message:"აირჩიე 1–3 განსხვავებული შენახული CJ კანდიდატი.",ids:[]};
 const rows=await prisma.sourceListing.findMany({where:{id:{in:parsed.data},provider:"cj",importedVia:"CJ_API",opportunityId:{not:null}},select:{id:true}});
 if(rows.length!==parsed.data.length)return {ok:false as const,message:"ერთ-ერთი ჩანაწერი აღარ არის შენახული CJ კანდიდატი. განაახლე გვერდი.",ids:[]};
 return {ok:true as const,message:"",ids:parsed.data};
}
