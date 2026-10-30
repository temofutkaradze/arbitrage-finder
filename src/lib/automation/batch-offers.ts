import {prisma} from "../db/prisma";
import {ebayConnectionMode} from "../providers/ebay-auth";
import {offerBlockReason} from "./batch-offer-policy";
import {fetchEbayOffers} from "../providers/offers";
export async function collectBatchOffers(listingId:number,marketId:number,collect:typeof fetchEbayOffers=fetchEbayOffers,configured=ebayConnectionMode()!=="missing"){
 const listing=await prisma.sourceListing.findUnique({where:{id:listingId},select:{opportunityId:true,provider:true,importedVia:true,name:true}});
 if(!listing?.opportunityId||listing.provider!=="cj"||listing.importedVia!=="CJ_API")return {state:"blocked" as const,attempted:false,message:"შენახული CJ კანდიდატი აღარ არის ხელმისაწვდომი."};
 const market=await prisma.market.findUnique({where:{id:marketId}});
 if(!market)return {state:"blocked" as const,attempted:false,message:"აირჩიე არსებული ბაზარი."};
 const evaluated=await prisma.evaluation.count({where:{opportunityId:listing.opportunityId,marketId}});
 const block=offerBlockReason({configured,country:market.countryCode,currency:market.currency,evaluated:!!evaluated,query:listing.name});
 if(block)return {state:"blocked" as const,attempted:false,message:block};
 try{
  const count=await collect(listing.opportunityId,marketId,listing.name);
  return {state:"done" as const,attempted:true,message:`eBay: ${count} შეთავაზება მიღებულია ${market.code}-ზე კატალოგის სახელით ძიებით. შეთავაზებები ჯერ pending-ია; ნულოვანი შედეგი მოთხოვნის არარსებობას არ ამტკიცებს.`,href:`/research?product=${listing.opportunityId}&market=${marketId}`};
 }catch(error){return {state:"failed" as const,attempted:true,message:error instanceof Error&&error.message.startsWith("eBay ")?error.message:"eBay-ის შედეგი ვერ დადასტურდა. ავტომატური განმეორება არ ხდება."};}
}
