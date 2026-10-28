"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { evidenceSchema } from "@/lib/research/evidence";
export async function addEvidence(_: string, data: FormData) {
  const result = evidenceSchema.safeParse(Object.fromEntries(data));
  if (!result.success) return "Check all fields: use a source URL, a summary of 10–2000 characters, a past observation date and a later expiry date.";
  try {
    await prisma.evidence.create({ data: result.data });
  } catch { return "Evidence was not saved. Check that the product and market still exist."; }
  revalidatePath("/", "layout");
  return "Evidence recorded. Its presence does not independently verify the claim.";
}
