import type { Scenario } from "./types";

/** Profit at different ad costs, holding everything else constant. */
export function buildScenarios(contributionBeforeAds: number, revenue: number, currentCac: number): Scenario[] {
  const pts: { label: string; cac: number }[] = [
    { label: "No ad cost", cac: 0 },
    { label: "Current estimate", cac: currentCac },
    ...[10, 20, 30].map((p) => ({ label: `Ads = ${p}% of revenue`, cac: Math.round((revenue * p) / 100) })),
  ];
  return pts.map((p) => {
    const netProfit = contributionBeforeAds - p.cac;
    return { label: p.label, cac: p.cac, netProfit, margin: revenue > 0 ? netProfit / revenue : null };
  });
}
