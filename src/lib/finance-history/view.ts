import { z } from "zod";
import { INPUT_DEFS } from "../profit/types";
const value = z.object({ value: z.number().nullable(), status: z.enum(["VERIFIED", "ESTIMATED", "UNKNOWN"]), note: z.string().nullable().optional() });
const schema = z.object({ format: z.literal(1), entity: z.enum(["MARKET", "EVALUATION"]), id: z.number().int(), version: z.number().int(),
  market: z.object({ id: z.number().int(), code: z.string(), name: z.string(), currency: z.string(), countryCode: z.string().nullable(), pricesIncludeTax: z.boolean() }),
  product: z.object({ id: z.number().int(), name: z.string() }).optional(),
  inputs: z.array(value.extend({ key: z.string() })).optional(),
  assumptions: z.record(z.string(), value).optional(), calculated: z.unknown().optional(),
});
export function readSnapshot(input: unknown) { const parsed = schema.safeParse(input); return parsed.success ? parsed.data : null; }
export type SnapshotView = NonNullable<ReturnType<typeof readSnapshot>>;
export type ValueView = z.infer<typeof value>;
export function snapshotChanges(before: SnapshotView | null, after: SnapshotView) {
  const rows = (s: SnapshotView | null): Record<string, ValueView> => !s ? {} : s.entity === "MARKET" ? s.assumptions ?? {} : Object.fromEntries((s.inputs ?? []).map(i => [i.key, { value: i.value, status: i.status, note: i.note }]));
  const a = rows(before), b = rows(after);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().filter(key => JSON.stringify(a[key]) !== JSON.stringify(b[key])).map(key => ({ key, label: INPUT_DEFS.find(d => d.key === key)?.label ?? key, before: a[key] ?? null, after: b[key] ?? null }));
}
export function historyValue(key: string, input: ValueView | null, currency: string) {
  if (!input) return "Not recorded";
  const def = INPUT_DEFS.find(d => d.key === key);
  const amount = input.value === null ? "Unknown" : def?.unit === "money" ? `${currency} ${(input.value/100).toFixed(2)}` : def?.unit === "percent" ? `${(input.value/100).toFixed(2)}%` : String(input.value);
  return `${amount} [${input.status}]`;
}
export function savedContribution(snapshot: SnapshotView | null) {
  if (!snapshot || snapshot.entity !== "EVALUATION") return null;
  const parsed = z.object({ complete: z.literal(true), netProfit: z.number().finite() }).safeParse(snapshot.calculated);
  return parsed.success ? `${snapshot.market.currency} ${(parsed.data.netProfit/100).toFixed(2)}` : "Unknown — required inputs were incomplete";
}
