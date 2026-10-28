"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { parseInput } from "@/lib/profit/format";
import { MARKET_KEYS } from "@/lib/profit/markets";
import { INPUT_DEFS, INPUT_KEYS, type DataStatus, type InputKey } from "@/lib/profit/types";
import type { StoredInput } from "@/lib/data/queries";

const STATUSES: DataStatus[] = ["VERIFIED", "ESTIMATED", "UNKNOWN"];
const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const id = (fd: FormData, k: string) => z.coerce.number().int().positive().parse(fd.get(k));

function readInputs(fd: FormData, keys: readonly InputKey[]) {
  return INPUT_DEFS.filter((d) => keys.includes(d.key)).map((d) => {
    const p = parseInput(d.unit, text(fd, `${d.key}__value`));
    if (p.error) throw new Error(`${d.label}: ${p.error}`);
    const chosen = text(fd, `${d.key}__status`) as DataStatus;
    let status: DataStatus = STATUSES.includes(chosen) ? chosen : "UNKNOWN";
    if (p.value === null) status = "UNKNOWN";
    else if (status === "UNKNOWN") status = "ESTIMATED"; // a number was typed but not marked verified
    const note = text(fd, `${d.key}__note`) || null;
    return { key: d.key, value: status === "UNKNOWN" ? null : p.value, status, note };
  });
}

export async function createMarket(fd: FormData) {
  const m = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,10}$/, "Code: 2-10 letters/digits"),
    name: z.string().trim().min(1).max(80),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Currency: 3-letter code"),
  }).parse({ code: text(fd, "code"), name: text(fd, "name"), currency: text(fd, "currency") });
  await prisma.market.create({ data: { ...m, pricesIncludeTax: fd.get("pricesIncludeTax") === "on" } });
  revalidatePath("/markets");
}

export async function saveMarket(fd: FormData) {
  const marketId = id(fd, "marketId");
  const assumptions: Record<string, StoredInput> = {};
  for (const i of readInputs(fd, MARKET_KEYS)) assumptions[i.key] = { value: i.value, status: i.status, note: i.note };
  await prisma.market.update({
    where: { id: marketId },
    data: { assumptions, pricesIncludeTax: fd.get("pricesIncludeTax") === "on" },
  });
  revalidatePath("/markets");
}

async function createEvaluation(opportunityId: number, marketId: number) {
  const market = await prisma.market.findUniqueOrThrow({ where: { id: marketId } });
  const a = (market.assumptions ?? {}) as unknown as Record<string, StoredInput>;
  await prisma.evaluation.create({
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
}

export async function createOpportunity(fd: FormData) {
  const o = z.object({
    name: z.string().trim().min(1).max(200),
    category: z.string().trim().max(80),
    sourceName: z.string().trim().max(80),
    sourceUrl: z.string().trim().max(500).refine((u) => u === "" || /^https?:\/\//.test(u), "URL must start with http(s)://"),
    notes: z.string().trim().max(2000),
  }).parse({ name: text(fd, "name"), category: text(fd, "category"), sourceName: text(fd, "sourceName"), sourceUrl: text(fd, "sourceUrl"), notes: text(fd, "notes") });
  const marketIds = fd.getAll("markets").map((v) => z.coerce.number().int().positive().parse(v));
  const opp = await prisma.opportunity.create({
    data: { name: o.name, category: o.category || null, sourceName: o.sourceName || null, sourceUrl: o.sourceUrl || null, notes: o.notes || null },
  });
  for (const mid of marketIds) await createEvaluation(opp.id, mid);
  revalidatePath("/", "layout");
  redirect(`/opportunities/${opp.id}`);
}

export async function addEvaluation(fd: FormData) {
  const opportunityId = id(fd, "opportunityId");
  await createEvaluation(opportunityId, id(fd, "marketId"));
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function saveEvaluation(fd: FormData) {
  const evaluationId = id(fd, "evaluationId");
  const inputs = readInputs(fd, INPUT_KEYS);
  await prisma.$transaction([
    ...inputs.map((i) =>
      prisma.costInput.upsert({
        where: { evaluationId_key: { evaluationId, key: i.key } },
        create: { evaluationId, ...i },
        update: { value: i.value, status: i.status, note: i.note },
      }),
    ),
    prisma.evaluation.update({ where: { id: evaluationId }, data: { updatedAt: new Date() } }),
  ]);
  revalidatePath("/", "layout");
}

export async function deleteOpportunity(fd: FormData) {
  await prisma.opportunity.delete({ where: { id: id(fd, "opportunityId") } });
  revalidatePath("/", "layout");
  redirect("/opportunities");
}
