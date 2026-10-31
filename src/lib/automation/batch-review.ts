import {batchIds} from "./research-batch";
export function parseBatchReview(ids:string|undefined,market:string|undefined){
 if(!ids||!/^\d+(,\d+){0,2}$/.test(ids))throw new Error("Invalid selection");
 const selected=batchIds.parse(ids.split(',').map(Number));
 if(market!==undefined&&(!/^[1-9]\d*$/.test(market)||!Number.isSafeInteger(Number(market))||Number(market)>2147483647))throw new Error("Invalid market");
 return {ids:selected,marketId:market===undefined?null:Number(market)};
}
