export const EVIDENCE_KINDS = ["SOURCING", "SHIPPING", "COMPETITION", "DEMAND", "ADVERTISING", "PRODUCT_RISK"] as const;
export const PROVENANCE = ["OBSERVED", "PROVIDER_ESTIMATE", "ASSUMPTION"] as const;
export type ResearchEvidence = { resolvedAt?: Date | null; kind: string; provenance: string; outcome: string; marketId: number | null; expiresAt: Date };
export function researchReadiness(evidence: ResearchEvidence[], marketId: number | null, now = new Date()) {
  // Market-specific evidence only supports that market. Global evidence cannot
  // establish local shipping, competition or demand.
  const globalKinds: readonly string[] = ["SOURCING", "ADVERTISING", "PRODUCT_RISK"];
  const relevant = evidence.filter((e) => !e.resolvedAt && e.expiresAt > now &&
    (e.marketId === marketId || (e.marketId === null && globalKinds.includes(e.kind))));
  if (relevant.some((e) => e.outcome === "CONCERN" && e.provenance !== "ASSUMPTION")) {
    return { label: "Risk review", missing: [] as string[], next: "Resolve the documented concern before testing." };
  }
  const missing = EVIDENCE_KINDS.filter((kind) => !relevant.some((e) => e.kind === kind && e.outcome === "SUPPORTS" && e.provenance === "OBSERVED"));
  return missing.length
    ? { label: "Needs research", missing: [...missing], next: `Confirm ${missing[0].toLowerCase().replaceAll("_", " ")} with a current source.` }
    : { label: "Evidence recorded", missing: [], next: "Review economics, order a sample and confirm fulfilment. Evidence does not prove profitable demand." };
}
