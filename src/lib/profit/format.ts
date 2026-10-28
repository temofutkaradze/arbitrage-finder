import type { Unit } from "./types";

export function parseInput(unit: Unit, raw: string): { value: number | null; error?: string } {
  const t = raw.trim().replace(",", ".");
  if (t === "") return { value: null };
  const x = Number(t);
  if (!Number.isFinite(x) || x < 0) return { value: null, error: `"${raw}" is not a valid non-negative number` };
  return { value: unit === "count" ? Math.round(x) : Math.round(x * 100) };
}
export function toDisplay(unit: Unit, v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return unit === "count" ? String(v) : String(v / 100);
}
export function formatMoney(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`;
  }
}
export const formatPct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);
