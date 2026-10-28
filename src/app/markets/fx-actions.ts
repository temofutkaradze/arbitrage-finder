"use server";
import { revalidatePath } from "next/cache";
import { refreshReferenceRates } from "@/lib/fx/service";
export async function refreshFx(){
 try{const count=await refreshReferenceRates();revalidatePath("/", "layout");return `Saved ${count} official reference rates; these are estimates, not bank execution prices.`;}
 catch(e){const message=e instanceof Error?e.message:"";return message.startsWith("FX ")?message:"FX rates could not be saved. Check database availability.";}
}
