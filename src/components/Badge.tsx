import type { DataStatus } from "@/lib/profit/types";
const label: Record<string, string> = { VERIFIED: "Verified", ESTIMATED: "Estimate", UNKNOWN: "Unknown", CALCULATED: "Calculated" };
export function Badge({ status }: { status: DataStatus | "CALCULATED" }) {
  return <span className={`badge ${status.toLowerCase()}`}>{label[status]}</span>;
}
export function Quality({ q }: { q: "verified" | "estimated" | "incomplete" }) {
  const m = { verified: ["verified", "Verified inputs"], estimated: ["estimated", "Contains estimates"], incomplete: ["unknown", "Incomplete"] }[q];
  return <span className={`badge ${m[0]}`}>{m[1]}</span>;
}
