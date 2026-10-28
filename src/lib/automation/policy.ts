import { z } from "zod";
export const DAILY_ATTEMPT_LIMIT = 20;
export const MAX_ENABLED = 5;
export const MAX_FAILURES = 5;
export const LEASE_MS = 120_000;
export const scheduleSchema = z.object({
  keyword: z.string().trim().toLowerCase().min(2).max(100).regex(/^[\p{L}\p{N} _-]+$/u, "Use a product phrase, not a URL or credential"),
  intervalHours: z.coerce.number().int().min(6).max(168),
});
export function utcDayStart(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
export function failurePolicy(failures: number, reason: string) {
  return { pause: reason === "AUTH" || failures >= MAX_FAILURES,
    delayMs: Math.min(86400000, Math.max(reason === "RATE" ? 3600000 : 900000, 900000 * 2 ** Math.max(0, failures - 1))) };
}
export function errorCategory(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Wait 30 seconds")) return "COOLDOWN";
  if (/^CJ(_ACCESS_TOKEN| authentication)/.test(message)) return "AUTH";
  if (message.startsWith("CJ rate limit")) return "RATE";
  if (message.startsWith("CJ request could not")) return "NETWORK";
  return "VALIDATION_OR_STORAGE";
}
