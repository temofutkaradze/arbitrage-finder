export function routeSummary(priceMinor: number | null, quotes: { shippingMinor: number; method: string; deliveryEstimate: string | null }[] | null) {
  if (!quotes?.length || priceMinor === null) return null;
  const cheapest = quotes.reduce((a, b) => a.shippingMinor <= b.shippingMinor ? a : b);
  return { method: cheapest.method, shippingMinor: cheapest.shippingMinor, subtotalMinor: priceMinor + cheapest.shippingMinor, deliveryEstimate: cheapest.deliveryEstimate };
}
