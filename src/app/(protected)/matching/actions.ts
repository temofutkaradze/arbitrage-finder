"use server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/server";
import { acceptListingLink, saveIdentity, undoListingLink, MatchingError } from "@/lib/matching/service";
function refresh() {
  revalidatePath("/matching"); revalidatePath("/discovery"); revalidatePath("/opportunities");
}
function message(e: unknown) { return e instanceof MatchingError ? e.message : "Nothing saved. Check the entered values and database availability."; }
export async function recordIdentity(_: string, data: FormData) {
  await requireOwner();
  try {
    await saveIdentity(Number(data.get("listingId")), Number(data.get("revision")), Object.fromEntries(["gtin", "brand", "mpn", "packUnits", "variantKey", "sourceUrl", "observedAt", "note"].map(key => [key, String(data.get(key) ?? "")])));
    refresh(); return "Identifiers saved with revision history. Review the updated matches below.";
  } catch (e) { return message(e); }
}
export async function linkListing(_: string, data: FormData) {
  await requireOwner();
  try {
    await acceptListingLink({ listingId: Number(data.get("listingId")), targetListingId: Number(data.get("targetListingId")), expectedOpportunityId: Number(data.get("expectedOpportunityId")), sourceRevision: Number(data.get("sourceRevision")), targetRevision: Number(data.get("targetRevision")), confirmed: data.get("confirmed") === "on", note: String(data.get("note") ?? "") });
    refresh(); return "Listing linked. Prices, evaluations and evidence were preserved.";
  } catch (e) { return message(e); }
}
export async function unlinkListing(_: string, data: FormData) {
  await requireOwner();
  try {
    await undoListingLink(Number(data.get("listingId")), Number(data.get("opportunityId")), String(data.get("note") ?? ""), data.get("confirmed") === "on");
    refresh(); return "Reviewed link undone; the research record and its evaluations remain available.";
  } catch (e) { return message(e); }
}
