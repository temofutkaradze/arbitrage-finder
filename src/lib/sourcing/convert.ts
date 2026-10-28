/** Exact decimal FX conversion. Rate is target currency units per 1 USD. */
export function convertUsdMinor(amount: number, rate: string): number {
  if (!Number.isSafeInteger(amount) || amount < 0 || !/^\d{1,6}(\.\d{1,8})?$/.test(rate)) throw new Error("Invalid amount or FX rate");
  const [whole, fraction = ""] = rate.split(".");
  const numerator = BigInt(whole + fraction), denominator = BigInt(10) ** BigInt(fraction.length);
  if (numerator === BigInt(0)) throw new Error("FX rate must be positive");
  const converted = (BigInt(amount) * numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
  if (converted > BigInt(2_000_000_000)) throw new Error("Converted amount exceeds supported range");
  return Number(converted);
}
