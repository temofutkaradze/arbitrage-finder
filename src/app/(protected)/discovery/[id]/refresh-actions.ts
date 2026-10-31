"use server";
import { requireOwner } from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import * as service from "@/lib/sourcing/refresh-service";
export async function startProductRefresh(listingId:number){
 await requireOwner();
 const result=await service.startProductRefresh(listingId);
 if(result.ok)revalidatePath("/", "layout");
 return result;
}
export async function refreshSavedRoute(listingId:number,quoteId:number){
 await requireOwner();
 const result=await service.refreshSavedRoute(listingId,quoteId);
 if(result.ok)revalidatePath("/", "layout");
 return result;
}
