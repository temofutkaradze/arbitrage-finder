import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { discoverCj } from "../discovery/cj";
import { parseImport, type ListingInput } from "../discovery/schema";
import { importListingsInTransaction } from "../discovery/import";
import { reserveCjOperation } from "../sourcing/service";
import { DAILY_ATTEMPT_LIMIT, MAX_ENABLED, LEASE_MS, scheduleSchema, failurePolicy, errorCategory, utcDayStart } from "./policy";

export async function createSchedule(input: unknown) {
  const values = scheduleSchema.parse(input);
  // Deliberately paused; a separate explicit action enables external requests.
  return prisma.discoverySchedule.create({ data: values });
}
export async function setScheduleEnabled(id: number, enabled: boolean) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340924)`;
    const job = await tx.discoverySchedule.findUniqueOrThrow({ where: { id } });
    if (job.enabled === enabled) return job;
    if (enabled && !job.enabled && await tx.discoverySchedule.count({ where: { enabled: true } }) >= MAX_ENABLED) throw new Error("At most five schedules can be enabled.");
    if (job.leaseToken) await tx.discoveryExecution.updateMany({ where: { scheduleId: id, state: "RUNNING" }, data: { state: "CANCELLED", finishedAt: new Date(), message: "Schedule changed; previous lease invalidated." } });
    return tx.discoverySchedule.update({ where: { id }, data: {
      enabled, leaseToken: null, leaseUntil: null, ...(enabled ? { nextRunAt: new Date(), failures: 0 } : {}),
    } });
  });
}
async function claimDue(now: Date) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340924)`;
    const job = await tx.discoverySchedule.findFirst({ where: { enabled: true, nextRunAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lte: now } }] }, orderBy: [{ nextRunAt: "asc" }, { id: "asc" }] });
    if (!job) return null;
    if (job.leaseToken) {
      const failures = job.failures + 1, policy = failurePolicy(failures, "INTERRUPTED");
      await tx.discoveryExecution.updateMany({ where: { scheduleId: job.id, state: "RUNNING" }, data: { state: "INTERRUPTED", finishedAt: now, message: "Expired worker lease; retry delayed." } });
      await tx.discoverySchedule.update({ where: { id: job.id }, data: { failures, enabled: !policy.pause, nextRunAt: new Date(now.getTime() + policy.delayMs), leaseToken: null, leaseUntil: null } });
      return { recovered: true as const };
    }
    const count = await tx.discoveryExecution.count({ where: { startedAt: { gte: utcDayStart(now) }, state: { notIn: ["DEFERRED"] } } });
    if (count >= DAILY_ATTEMPT_LIMIT) return null;
    const token = randomUUID();
    await tx.discoverySchedule.update({ where: { id: job.id }, data: { leaseToken: token, leaseUntil: new Date(now.getTime() + LEASE_MS) } });
    const execution = await tx.discoveryExecution.create({ data: { scheduleId: job.id, state: "RUNNING", startedAt: now } });
    return { recovered: false as const, job, token, execution };
  });
}

type Dependencies = { fetch: (keyword: string) => Promise<ListingInput[]>; reserve: () => Promise<unknown> };
export async function runDiscoveryTick(dependencies: Dependencies = { fetch: keyword => discoverCj(keyword, undefined, "newest"), reserve: reserveCjOperation }) {
  await prisma.discoveryWorkerStatus.upsert({ where: { id: "cj" }, create: { id: "cj", lastSeenAt: new Date() }, update: { lastSeenAt: new Date() } });
  const claim = await claimDue(new Date());
  if (!claim) return "IDLE";
  if (claim.recovered) return "RECOVERED";
  const { job, token, execution } = claim;
  try {
    await dependencies.reserve();
    const fetched = await dependencies.fetch(job.keyword);
    if (fetched.length > 20) throw new Error("Page exceeds configured result bound");
    // Revalidate before persistence. Empty pages are successful, not false errors.
    const rows = fetched.length ? parseImport(JSON.stringify(fetched.map(row => ({ ...row, observedAt: row.observedAt.toISOString() })))) : [];
    return await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340924)`;
      const current = await tx.discoverySchedule.findUniqueOrThrow({ where: { id: job.id } });
      if (!current.enabled || current.leaseToken !== token || !current.leaseUntil || current.leaseUntil <= new Date()) return "LEASE_LOST";
      const counts = rows.length ? await importListingsInTransaction(tx, rows, "cj", `cj-schedule:${execution.id}`) : { created: 0, updated: 0, unchanged: 0 };
      await tx.discoveryExecution.update({ where: { id: execution.id }, data: { state: "SUCCEEDED", finishedAt: new Date(), ...counts, message: "One bounded newest-product page processed; full catalogue coverage is not guaranteed." } });
      await tx.discoverySchedule.update({ where: { id: job.id }, data: { failures: 0, leaseToken: null, leaseUntil: null, nextRunAt: new Date(Date.now() + job.intervalHours * 3600000) } });
      return "SUCCEEDED";
    }, { timeout: 20_000 });
  } catch (error) {
    const category = errorCategory(error);
    return prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340924)`;
      const current = await tx.discoverySchedule.findUniqueOrThrow({ where: { id: job.id } });
      if (current.leaseToken !== token) return "LEASE_LOST";
      const deferred = category === "COOLDOWN", failures = deferred ? job.failures : job.failures + 1;
      const policy = failurePolicy(failures, category);
      await tx.discoveryExecution.update({ where: { id: execution.id }, data: { state: deferred ? "DEFERRED" : "FAILED", finishedAt: new Date(), message: category } });
      await tx.discoverySchedule.update({ where: { id: job.id }, data: { failures, enabled: deferred || !policy.pause, leaseToken: null, leaseUntil: null, nextRunAt: new Date(Date.now() + (deferred ? 31000 : policy.delayMs)) } });
      return deferred ? "DEFERRED" : "FAILED";
    });
  }
}
