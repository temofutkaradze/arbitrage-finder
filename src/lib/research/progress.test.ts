import { describe, it, expect } from "vitest";
import { researchProgress } from "./progress";
import { EVIDENCE_KINDS, type ResearchEvidence } from "./readiness";
const now = new Date("2026-10-29T12:00:00Z");
const evidence = (overrides: Partial<ResearchEvidence> = {}): ResearchEvidence => ({ kind: "SOURCING", marketId: null, provenance: "OBSERVED", outcome: "SUPPORTS", expiresAt: new Date("2026-11-01"), ...overrides });
const result = { complete: false as const, missing: ["cac" as const], quality: "incomplete" as const };
describe("product research progress", () => {
  it("does not transfer local evidence between markets or accept global local claims", () => {
    const records = [evidence(), evidence({kind:"SHIPPING",marketId:2}), evidence({kind:"DEMAND"})];
    const p = researchProgress(records,1,result,now);
    expect(p.recorded).toBe(1);
    expect(p.next).toContain("მიწოდება");
  });
  it("excludes expired, retired, assumed and provider-estimated support", () => {
    for (const record of [evidence({expiresAt:now}), evidence({resolvedAt:now}), evidence({provenance:"ASSUMPTION"}), evidence({provenance:"PROVIDER_ESTIMATE"})]) {
      expect(researchProgress([record],1,result,now).recorded).toBe(0);
    }
  });
  it("prioritizes a current concern over conflicting support and missing topics", () => {
    const p = researchProgress([evidence(),evidence({outcome:"CONCERN"})],1,result,now);
    expect(p.steps[0].state).toBe("concern");
    expect(p.recorded).toBe(0);
    expect(p.next).toContain("რისკი");
  });
  it("asks for economics when evidence topics are recorded", () => {
    const p=researchProgress(EVIDENCE_KINDS.map(kind=>evidence({kind,marketId:1})),1,result,now);
    expect(p.recorded).toBe(6);
    expect(p.next).toContain("ფინანსური");
  });
});
