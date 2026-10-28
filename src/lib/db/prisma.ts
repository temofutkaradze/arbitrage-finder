import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../generated/prisma/client";
import { assertMainDatabase } from "./guard";

const g = globalThis as unknown as { prisma?: PrismaClient };

function make() {
  assertMainDatabase(process.env.DATABASE_URL); // never connect to anything but "arbitrage"
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
}

export const prisma = g.prisma ?? make();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
