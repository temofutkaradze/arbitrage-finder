import "dotenv/config";
import { setTimeout } from "node:timers/promises";
import { prisma } from "../src/lib/db/prisma";
import { runDiscoveryTick } from "../src/lib/automation/service";
const stop = new AbortController();
process.once("SIGINT", () => stop.abort());
process.once("SIGTERM", () => stop.abort());
async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !["--once", "--dry-run"].includes(arg))) throw new Error("Unsupported worker option");
  if (args.includes("--dry-run")) {
    const jobs = await prisma.discoverySchedule.findMany({ where: { enabled: true, nextRunAt: { lte: new Date() } }, select: { id: true, nextRunAt: true, leaseUntil: true } });
    console.log(JSON.stringify({ mode: "DRY_RUN", due: jobs })); return;
  }
  do {
    try { console.log(JSON.stringify({ time: new Date().toISOString(), outcome: await runDiscoveryTick() })); }
    catch { if (args.includes("--once")) throw new Error("Worker tick failed"); console.error("Worker tick unavailable; check database connectivity. No raw error details logged."); }
    if (args.includes("--once")) break;
    await setTimeout(30_000, undefined, { signal: stop.signal }).catch(() => {});
  } while (!stop.signal.aborted);
}
main().catch(() => { console.error("Discovery worker could not complete. Check configuration and database readiness."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
