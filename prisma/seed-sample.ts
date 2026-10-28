import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { assertMainDatabase } from "../src/lib/db/guard";
import { INPUT_KEYS, type InputKey } from "../src/lib/profit/types";

// Adds ONE clearly-labelled illustrative item. Excluded from every overview metric. Run: npm run seed:sample
assertMainDatabase(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const V: Partial<Record<InputKey, number>> = {
  sellingPrice: 12900, supplierPrice: 4500, shippingToCustomer: 900, importDutyPct: 500, taxRate: 0,
  paymentFeePct: 290, paymentFeeFixed: 30, returnRatePct: 600, returnCostPerReturn: 3000, cac: 2500,
};

async function main() {
  if (await prisma.opportunity.findFirst({ where: { isSample: true } })) return console.log("Sample already present.");
  const market = await prisma.market.upsert({
    where: { code: "SAMPLE" }, update: {},
    create: { code: "SAMPLE", name: "SAMPLE market (illustrative only)", currency: "USD" },
  });
  const opp = await prisma.opportunity.create({
    data: { name: "SAMPLE: illustrative item, not a real listing", notes: "Made-up numbers to test the interface.", isSample: true },
  });
  await prisma.evaluation.create({
    data: {
      opportunityId: opp.id, marketId: market.id,
      inputs: { create: INPUT_KEYS.map((key) => ({ key, value: V[key] ?? null, status: V[key] === undefined ? "UNKNOWN" as const : "ESTIMATED" as const, note: V[key] === undefined ? null : "SAMPLE value" })) },
    },
  });
  console.log("Sample item added.");
}
main().finally(() => prisma.$disconnect());
