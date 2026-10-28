"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { refreshVariants, reserveCjOperation, fetchFreight, applySourcingQuote } from "@/lib/sourcing/service";
import { quoteRequestSchema } from "@/lib/sourcing/schema";
const messages = ["CJ ", "Wait ", "Select ", "Set ", "Refresh ", "The selected ", "This ", "Quote,", "Use an FX"];
function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return messages.some((prefix) => message.startsWith(prefix)) ? message : "Nothing was applied. Check the input fields and database availability.";
}
export async function refreshCandidate(_: string, data: FormData) {
  try {
    const id = z.coerce.number().int().positive().parse(data.get("listingId"));
    await reserveCjOperation();
    const count = await refreshVariants(id);
    revalidatePath(`/discovery/${id}`);
    return `Refreshed ${count} variants and their provider inventory reports.`;
  } catch (error) { return safeError(error); }
}
export async function requestShipping(_: string, data: FormData) {
  try {
    const args = quoteRequestSchema.parse(Object.fromEntries(data));
    await reserveCjOperation();
    const count = await fetchFreight(args);
    revalidatePath("/discovery", "layout");
    return count ? `Saved ${count} shipping estimates for one unit. Review taxes and delivery limitations.` : "CJ returned no shipping methods for this route. This does not prove that all fulfilment options are unavailable.";
  } catch (error) { return safeError(error); }
}
export async function applyQuote(_: string, data: FormData) {
  try {
    const opportunityId = await applySourcingQuote({
      quoteId: Number(data.get("quoteId")), evaluationId: Number(data.get("evaluationId")), confirmed: data.get("confirmed") === "on",
      fxRate: String(data.get("fxRate") ?? ""), fxSource: String(data.get("fxSource") ?? ""), fxDate: String(data.get("fxDate") ?? ""),
    });
    revalidatePath("/", "layout");
    return `Applied as estimates to opportunity ${opportunityId}. Duty inputs were cleared for review; no other financial inputs were filled.`;
  } catch (error) { return safeError(error); }
}
