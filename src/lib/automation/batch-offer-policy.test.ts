import {expect,it} from "vitest";
import {offerBlockReason} from "./batch-offer-policy";
it("blocks missing access, unsupported country/currency, absent evaluation and unsuitable query",()=>{
 const good={configured:true,country:'US',currency:'USD',evaluated:true,query:'shelf'};
 expect(offerBlockReason(good)).toBeNull();
 for(const patch of [{configured:false},{country:null},{country:'GE',currency:'GEL'},{currency:'EUR'},{evaluated:false},{query:'x'},{query:'x'.repeat(101)}])expect(offerBlockReason({...good,...patch})).toBeTruthy();
});
