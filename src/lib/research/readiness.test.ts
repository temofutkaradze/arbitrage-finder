import { describe, expect, it } from "vitest";
import { EVIDENCE_KINDS, researchReadiness } from "./readiness";
import { evidenceSchema } from "./evidence";
const now=new Date("2026-02-01T00:00:00Z");
const evidence=EVIDENCE_KINDS.map((kind)=>({kind,provenance:"OBSERVED",outcome:"SUPPORTS",marketId:1,expiresAt:new Date("2026-03-01T00:00:00Z")}));
describe("research readiness",()=>{
  it("requires every evidence topic for a market",()=>expect(researchReadiness(evidence,1,now).missing).toEqual([]));
  it("does not transfer market evidence to another country",()=>expect(researchReadiness(evidence,2,now).missing).toHaveLength(6));
  it("does not let global evidence establish local demand or shipping",()=>expect(researchReadiness(evidence.map(e=>({...e,marketId:null})),1,now).missing).toEqual(["SHIPPING","COMPETITION","DEMAND"]));
  it("excludes expired and estimated support",()=>{
    expect(researchReadiness(evidence.map(e=>({...e,expiresAt:now})),1,now).missing).toHaveLength(6);
    expect(researchReadiness(evidence.map(e=>({...e,provenance:"PROVIDER_ESTIMATE"})),1,now).missing).toHaveLength(6);
  });
  it("escalates a concern even with supporting records",()=>expect(researchReadiness([...evidence,{...evidence[0],outcome:"CONCERN"}],1,now).label).toBe("Risk review"));
  it("rejects impossible calendar dates",()=>expect(evidenceSchema.safeParse({opportunityId:1,marketId:"",kind:"SOURCING",provenance:"OBSERVED",summary:"A sufficiently long note",url:"https://example.com",observedAt:"2026-02-30",expiresAt:"2026-03-01",outcome:"SUPPORTS"}).success).toBe(false));
});
