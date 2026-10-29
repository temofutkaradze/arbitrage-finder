export const REPORT_FRESH_MS = 24 * 60 * 60 * 1000;
export function quoteUsability(q: { expiresAt: Date; productObservedAt: Date | null; productPriceMinor: number | null; destinationCountry: string }, country: string | null, now = new Date()) {
  if (!country || q.destinationCountry !== country) return "route";
  if (q.expiresAt <= now || !q.productObservedAt || now.getTime() - q.productObservedAt.getTime() >= REPORT_FRESH_MS) return "stale";
  return q.productPriceMinor === null ? "price" : "review";
}
