"use server";
import {requireOwner} from "@/lib/auth/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { parseInput } from "@/lib/profit/format";
import { countryCode } from "@/lib/sourcing/schema";
import { CURRENCIES } from "@/lib/discovery/schema";
import { MARKET_KEYS } from "@/lib/profit/markets";
import { INPUT_DEFS, INPUT_KEYS, type DataStatus, type InputKey } from "@/lib/profit/types";
import type { Prisma } from "../../../generated/prisma/client";
import { EditConflictError, expectedVersion } from "@/lib/forms/editing";
import { InputValidationError } from "@/lib/forms/errors";
import { sourceUrl } from "@/lib/discovery/schema";
import type { StoredInput } from "@/lib/data/queries";

import { captureEvaluation, captureMarketEvaluations, marketSnapshot, recordChange, historyData } from "@/lib/finance-history/write";

const STATUSES: DataStatus[] = ["VERIFIED", "ESTIMATED", "UNKNOWN"];
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const id = (fd: FormData, k: string) => z.coerce.number().int().positive().parse(fd.get(k));

function readInputs(fd: FormData, keys: readonly InputKey[]) {
  return INPUT_DEFS.filter((d) => keys.includes(d.key)).map((d) => {
    const p = parseInput(d.unit, text(fd, `${d.key}__value`));
    if (p.error || (p.value !== null && (!Number.isSafeInteger(p.value) || p.value > 2_000_000_000))) throw new InputValidationError(`${d.label}: enter a valid non-negative value within the supported range.`);
    const chosen = text(fd, `${d.key}__status`) as DataStatus;
    let status: DataStatus = STATUSES.includes(chosen) ? chosen : "UNKNOWN";
    if (p.value === null) status = "UNKNOWN";
    else if (status === "UNKNOWN") status = "ESTIMATED"; // a number was typed but not marked verified
    const note = text(fd, `${d.key}__note`) || null;
    if (note && note.length > 2000) throw new InputValidationError(`${d.label}: notes are limited to 2000 characters.`);
    return { key: d.key, value: status === "UNKNOWN" ? null : p.value, status, note };
  });
}

export async function createMarket(fd: FormData) {
 await requireOwner();
  const m = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,10}$/, "Code: 2-10 letters/digits"),
    name: z.string().trim().min(1).max(80),
    currency: z.enum(CURRENCIES),
    countryCode: countryCode.nullable(),
  }).parse({ code: text(fd, "code"), name: text(fd, "name"), currency: text(fd, "currency"), countryCode: text(fd, "countryCode") || null });
  await prisma.$transaction(async tx => {
    const created = await tx.market.create({ data: { ...m, pricesIncludeTax: fd.get("pricesIncludeTax") === "on" } });
    await recordChange(tx, "MARKET_CREATED", null, marketSnapshot(created), { actor: "OWNER", reason: "Market created; defaults start unknown" });
  });
  revalidatePath("/markets");
}

export async function saveMarket(fd: FormData) {
 await requireOwner();
  const marketId = id(fd, "marketId"), version = expectedVersion(fd);
  const assumptions: Record<string, StoredInput> = {};
  for (const i of readInputs(fd, MARKET_KEYS)) assumptions[i.key] = { value: i.value, status: i.status, note: i.note };
  const destination = countryCode.nullable().parse(text(fd, "countryCode") || null);
  const savedVersion = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340923)`;
    const previous = await tx.market.findUniqueOrThrow({ where: { id: marketId } });
    const contextChanged = previous.countryCode !== destination || previous.pricesIncludeTax !== (fd.get("pricesIncludeTax") === "on");
    const oldEvaluations = contextChanged ? await captureMarketEvaluations(tx, previous) : [];
    const claimed = await tx.market.updateMany({ where: { id: marketId, version }, data: { version: { increment: 1 }, assumptions, countryCode: destination, pricesIncludeTax: fd.get("pricesIncludeTax") === "on" } });
    if (claimed.count !== 1) throw new EditConflictError();
    if (previous.countryCode !== destination) {
      // A route change invalidates copied CJ estimates, while preserving manually
      // entered costs and the immutable original quote for historical review.
      await tx.costInput.updateMany({ where: {
        evaluation: { marketId }, key: { in: ["supplierPrice", "shippingToCustomer", "importDutyPct", "importDutyFixed"] }, note: { startsWith: "CJ estimate #" },
      }, data: { value: null, status: "UNKNOWN", note: "CJ sourcing estimate invalidated: destination country changed. Request a new quote." } });
      await tx.evidence.updateMany({ where: { marketId, kind: { in: ["SOURCING", "SHIPPING"] }, summary: { startsWith: "CJ estimate #" } }, data: { expiresAt: new Date() } });
      await tx.competitorObservation.updateMany({where:{marketId},data:{expiresAt:new Date()}});
      await tx.externalOffer.updateMany({where:{marketId},data:{state:"INVALIDATED",reviewNote:"Destination changed; repeat market-specific research."}});

    }
    if (contextChanged) {
      await tx.evaluation.updateMany({ where: { marketId }, data: { version: { increment: 1 }, updatedAt: new Date() } });
    }
    const latestMarket = await tx.market.findUniqueOrThrow({ where: { id: marketId } });
    const marketChange = await recordChange(tx, "MARKET_SETTINGS", marketSnapshot(previous), marketSnapshot(latestMarket), { actor: "OWNER", reason: "Market assumptions, tax display or destination saved" });
    if (contextChanged) {
      const latest = await captureMarketEvaluations(tx, latestMarket);
      const oldById = new Map(oldEvaluations.map(e => [e.id, e]));
      if (latest.some(e => !oldById.has(e.id))) throw new Error("Evaluation set changed during market history capture");
      if (latest.length) await tx.financialChange.createMany({ data: latest.map(e => historyData("MARKET_CONTEXT", oldById.get(e.id)!, e, {
        actor: "MARKET_CHANGE", marketChangeId: marketChange.id,
        reason: previous.countryCode !== destination ? "Destination changed; copied CJ cost estimates cleared for review. Manually entered costs preserved." : "Tax-inclusive price interpretation changed; stored cost inputs preserved.",
      })) });
    }
    return version + 1;
  }, { timeout: 20_000 });
  revalidatePath("/", "layout");
  return savedVersion;
}

async function createEvaluation(opportunityId: number, marketId: number, db: Prisma.TransactionClient) {
  const existing = await db.evaluation.findUnique({ where: { opportunityId_marketId: { opportunityId, marketId } } });
  if (existing) return;
  const market = await db.market.findUniqueOrThrow({ where: { id: marketId } });
  const a = (market.assumptions ?? {}) as unknown as Record<string, StoredInput>;
  const created = await db.evaluation.create({
    data: {
      opportunityId, marketId,
      inputs: {
        create: INPUT_KEYS.map((key) => {
          const m = MARKET_KEYS.includes(key) ? a[key] : undefined;
          return { key, value: m?.value ?? null, status: m && m.value !== null ? m.status : "UNKNOWN", note: m?.note ?? null };
        }),
      },
    },
  });
  await recordChange(db, "EVALUATION_CREATED", null, await captureEvaluation(db, created.id), { actor: "OWNER", reason: "Evaluation initialized from market defaults; remaining inputs unknown" });
}

export async function createOpportunity(fd: FormData) {
 await requireOwner();
  const o = z.object({
    name: z.string().trim().min(1).max(200),
    category: z.string().trim().max(80),
    sourceName: z.string().trim().max(80),
    sourceUrl: z.union([z.literal(""), sourceUrl]),
    notes: z.string().trim().max(2000),
  }).parse({ name: text(fd, "name"), category: text(fd, "category"), sourceName: text(fd, "sourceName"), sourceUrl: text(fd, "sourceUrl"), notes: text(fd, "notes") });
  const marketIds = fd.getAll("markets").map((v) => z.coerce.number().int().positive().parse(v));
  const opp = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340923)`;
    const product = await tx.opportunity.create({
      data: { name: o.name, category: o.category || null, sourceName: o.sourceName || null, sourceUrl: o.sourceUrl || null, notes: o.notes || null },
    });
    for (const mid of new Set(marketIds)) await createEvaluation(product.id, mid, tx);
    return product;
  });
  revalidatePath("/", "layout");
  redirect(`/opportunities/${opp.id}`);
}

export async function addEvaluation(fd: FormData) {
 await requireOwner();
  const opportunityId = id(fd, "opportunityId");
  const marketId = id(fd, "marketId");
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340923)`;
    await createEvaluation(opportunityId, marketId, tx);
  });
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function saveEvaluation(fd: FormData) {
 await requireOwner();
  const evaluationId = id(fd, "evaluationId"), version = expectedVersion(fd);
  const inputs = readInputs(fd, INPUT_KEYS);
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340923)`;
    const before = await captureEvaluation(tx, evaluationId);
    const claimed = await tx.evaluation.updateMany({ where: { id: evaluationId, version }, data: { version: { increment: 1 } } });
    if (claimed.count !== 1) throw new EditConflictError();
    for (const i of inputs) await tx.costInput.upsert({
      where: { evaluationId_key: { evaluationId, key: i.key } }, create: { evaluationId, ...i },
      update: { value: i.value, status: i.status, note: i.note },
    });
    await recordChange(tx, "MANUAL_INPUTS", before, await captureEvaluation(tx, evaluationId), { actor: "OWNER", reason: "Financial inputs saved manually" });
  });
  revalidatePath("/", "layout");
  return version + 1;
}

export async function deleteOpportunity(fd: FormData) {
 await requireOwner();
  const opportunityId = id(fd, "opportunityId");
  await prisma.$transaction(async (tx) => {
    // Serialize deletion with supplier identity review and candidate promotion.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340921)`;
    await tx.opportunity.delete({ where: { id: opportunityId } });
  });
  revalidatePath("/", "layout");
  redirect("/opportunities");
}
