"use server";
import {requireOwner} from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { parseImport } from "@/lib/discovery/schema";
import { importListings, promoteListing } from "@/lib/discovery/import";
import { discoverCj } from "@/lib/discovery/cj";
import { prisma } from "@/lib/db/prisma";

export async function importCatalogue(_: string, data: FormData) {
 await requireOwner();
  let rows;
  try { rows = parseImport(String(data.get("catalogue") ?? "")); }
  catch { return "Import rejected. Use 1–100 valid records, supported currencies, integer minor-unit prices and past ISO observation dates. Each provider/product/variant must be unique. Maximum 250 KB."; }
  try {
    const c = await importListings(rows, `json:${[...new Set(rows.map((r) => r.provider))].join(",")}`);
    revalidatePath("/discovery");
    return `Saved: ${c.created} new, ${c.updated} changed, ${c.unchanged} unchanged.`;
  } catch { return "Nothing saved. Check conflicting or older observation dates, or database availability."; }
}

async function searchCj(_: string, data: FormData) {
  const keyword = String(data.get("keyword") ?? "").trim();
  if (!keyword || keyword.length > 100) return "Enter a search phrase of 1–100 characters.";
  if (!process.env.CJ_ACCESS_TOKEN) return "CJ is not connected. Configure a CJ access token or API Key as CJ_ACCESS_TOKEN securely on the server. No secret is entered in this form.";
  // Shared cooldown survives process restarts and prevents parallel quota bursts.
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340922)`;
      const last = await tx.importRun.findFirst({ where: { source: "cj-attempt" }, orderBy: { completedAt: "desc" } });
      if (last && Date.now() - last.completedAt.getTime() < 30_000) return "Wait 30 seconds between CJ searches.";
      await tx.importRun.create({ data: { source: "cj-attempt", created: 0, updated: 0, unchanged: 0 } });
      return "reserved";
    });
  } catch { return "Could not reserve a search. Check database availability."; }
}

// Separate execution after a durable reservation, so a failed API call still
// consumes the cooldown. Never put network activity inside a database transaction.
export async function discoverCatalogue(state: string, data: FormData) {
 await requireOwner();
  const reservation = await searchCj(state, data);
  if (reservation !== "reserved") return reservation;
  try {
    const rows = await discoverCj(String(data.get("keyword")).trim());
    if (!rows.length) return "CJ returned no products for this phrase.";
    const c = await importListings(rows, "cj");
    revalidatePath("/discovery");
    return `CJ: ${c.created} new, ${c.updated} changed, ${c.unchanged} unchanged. Catalogue prices are not final quotes.`;
  } catch (e) {
    // Only known connector errors are safe to display; schema/DB errors may contain payloads.
    const message = e instanceof Error ? e.message : "";
    return message.startsWith("CJ ") ? message : "Search failed validation or storage. No batch was imported.";
  }
}

export async function selectCandidate(data: FormData) {
 await requireOwner();
  const id = z.coerce.number().int().positive().parse(data.get("listingId"));
  const opportunityId = await promoteListing(id);
  revalidatePath("/discovery"); revalidatePath("/", "layout");
  redirect(`/opportunities/${opportunityId}`);
}
