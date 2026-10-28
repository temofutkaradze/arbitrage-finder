import { calculate } from "./calculate";
import type { Inputs, MarketSettings } from "./types";
/** CAC is deliberately excluded: this is a spending ceiling, never an ad forecast. */
export function calculateBeforeAds(inputs: Inputs, market: MarketSettings) {
  const result = calculate({ ...inputs, cac: { value: 0, status: "ESTIMATED" } }, market);
  if (!result.complete) return null;
  return { contribution: result.contributionBeforeAds, breakEvenRoas: result.breakEvenRoas,
    assumedZero: result.assumedZero, estimatedKeys: result.estimatedKeys.filter((k) => k !== "cac") };
}
