"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { fetchEbayOffers, reviewOffer } from "@/lib/providers/offers";
export async function fetchOffers(_:string,data:FormData){
 const input=z.object({opportunityId:z.coerce.number().int().positive(),marketId:z.coerce.number().int().positive(),query:z.string().trim().min(2).max(100)}).safeParse(Object.fromEntries(data));
 if(!input.success)return "Choose a product, market and a search phrase of 2–100 characters.";
 try{const count=await fetchEbayOffers(input.data.opportunityId,input.data.marketId,input.data.query);revalidatePath("/research");return `Received ${count} offers for manual comparison. None were marked comparable automatically.`;}
 catch(e){const message=e instanceof Error?e.message:"";return message.startsWith("eBay ")?message:"Offers were not saved. Check provider response validation and database availability.";}
}
export async function reviewExternalOffer(_:string,data:FormData){
 try{await reviewOffer(Object.fromEntries(data));revalidatePath("/", "layout");return "Review saved. Accepted offers remain price observations, not demand evidence.";}
 catch(e){const message=e instanceof Error?e.message:"";return message.startsWith("Offer ")?message:"Review not saved. Explain the comparison and confirm a match, shipping value or unknown, and tax basis.";}
}
