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
export async function collectResearchBatchOffers(listingId:number,marketId:number){
 await requireOwner();
 if(!Number.isSafeInteger(listingId)||listingId<1||listingId>2147483647||!Number.isSafeInteger(marketId)||marketId<1||marketId>2147483647)return {state:"blocked" as const,attempted:false,message:"კანდიდატის ან ბაზრის ID არასწორია."};
 const {collectBatchOffers}=await import("@/lib/automation/batch-offers");
 return collectBatchOffers(listingId,marketId);
}
