import { expect, it } from "vitest";
import { readSnapshot, snapshotChanges, historyValue, savedContribution } from "./view";
const base={format:1,entity:"EVALUATION",id:1,version:1,market:{id:1,code:"GE",name:"Fixture",currency:"GEL",countryCode:"GE",pricesIncludeTax:false},inputs:[{key:"supplierPrice",value:1200,status:"ESTIMATED",note:"Old source"}],calculated:{complete:false,missing:["cac"]}};
it("detects status-only and note-only corrections even when the number stays the same",()=>{
 const before=readSnapshot(base)!;
 for(const changes of [{status:"VERIFIED"},{note:"Corrected source"}]){const after=readSnapshot({...base,version:2,inputs:[{...base.inputs[0],...changes}]})!;expect(snapshotChanges(before,after)).toHaveLength(1);}
 expect(snapshotChanges(before,readSnapshot({...base,version:2})!)).toEqual([]);
});
it("preserves absent versus unknown/zero values and money/percent units",()=>{
 expect(historyValue("supplierPrice",null,"GEL")).toBe("Not recorded");
 expect(historyValue("supplierPrice",{value:null,status:"UNKNOWN"},"GEL")).toBe("Unknown [UNKNOWN]");
 expect(historyValue("supplierPrice",{value:0,status:"ESTIMATED"},"GEL")).toBe("GEL 0.00 [ESTIMATED]");
 expect(historyValue("taxRate",{value:1800,status:"ESTIMATED"},"GEL")).toBe("18.00% [ESTIMATED]");
});
it("shows only saved complete calculations and tolerates unsupported snapshots",()=>{
 expect(readSnapshot({exists:false})).toBeNull();expect(readSnapshot({format:99})).toBeNull();
 expect(savedContribution(readSnapshot(base))).toContain("Unknown");
 expect(savedContribution(readSnapshot({...base,calculated:{complete:true,netProfit:-1234}}))).toBe("GEL -12.34");
});
