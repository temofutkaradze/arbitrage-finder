import {expect,it} from "vitest";
import {parseBatchReview} from "./batch-review";
it("requires one to three unique bounded listing IDs and an explicit valid market when supplied",()=>{
 expect(parseBatchReview('1,2,3','9')).toEqual({ids:[1,2,3],marketId:9});expect(parseBatchReview('1',undefined).marketId).toBeNull();
 for(const ids of [undefined,'','0','1,1','1,2,3,4','1e2','1,-2','2147483648'])expect(()=>parseBatchReview(ids,undefined)).toThrow();
 for(const market of ['','0','-1','1e2','2147483648'])expect(()=>parseBatchReview('1',market)).toThrow();
});
