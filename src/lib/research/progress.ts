import { EVIDENCE_KINDS, type ResearchEvidence } from "./readiness";
import type { CalcResult } from "../profit/types";
const labels = {
  SOURCING: "მომწოდებელი და ზუსტი ვარიანტი", SHIPPING: "მიწოდება არჩეულ ბაზარზე",
  COMPETITION: "კონკურენტების შედარება", DEMAND: "მოთხოვნის მტკიცებულება",
  ADVERTISING: "რეკლამის კვლევა", PRODUCT_RISK: "ხარისხი და პროდუქტის რისკები",
};
export function researchProgress(evidence: ResearchEvidence[], marketId: number, result: CalcResult, now = new Date()) {
  const globalKinds: readonly string[] = ["SOURCING", "ADVERTISING", "PRODUCT_RISK"];
  const relevant = evidence.filter(e => !e.resolvedAt && e.expiresAt > now &&
    (e.marketId === marketId || (e.marketId === null && globalKinds.includes(e.kind))));
  const steps = EVIDENCE_KINDS.map(kind => {
    const records = relevant.filter(e => e.kind === kind);
    // An unresolved observed/provider concern always takes priority over support.
    const concern = records.some(e => e.outcome === "CONCERN" && e.provenance !== "ASSUMPTION");
    const supported = records.some(e => e.outcome === "SUPPORTS" && e.provenance === "OBSERVED");
    return { kind, label: labels[kind], state: concern ? "concern" : supported ? "recorded" : "missing" };
  });
  const concern = steps.find(s => s.state === "concern");
  const missing = steps.find(s => s.state === "missing");
  const next = concern ? `გადაამოწმე დაფიქსირებული რისკი: ${concern.label}.` : missing ? `შეაგროვე მიმდინარე წყარო: ${missing.label}.` : !result.complete ? "შეავსე ფინანსური შეფასების აუცილებელი მონაცემები." : result.netProfit <= 0 ? "გადახედე ხარჯებსა და ფასს — შეფასებული კონტრიბუცია დადებითი არ არის." : "გადახედე ვარაუდებს, ნიმუშის შემოწმებასა და შესრულების პირობებს.";
  return { steps, next, recorded: steps.filter(s => s.state === "recorded").length };
}
