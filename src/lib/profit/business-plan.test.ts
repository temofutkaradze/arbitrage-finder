import {expect,it} from "vitest";
import {businessPlan} from "./business-plan";
import {INPUT_DEFS,type Inputs} from "./types";
const inputs=Object.fromEntries(INPUT_DEFS.map(d=>[d.key,{value:d.key==='sellingPrice'?10000:d.key==='supplierPrice'?3000:d.key==='shippingToCustomer'?1000:d.key==='cac'?2000:0,status:'ESTIMATED'}])) as Inputs;
const a={monthlyFixed:20000,monthlyOrders:100,targetMarginBp:2000,buffer:300,payoutDays:7,dailyOrders:4,cashReserve:50000};
it('distinguishes break-even CAC from target-profit CAC and cash from expenses without mutations',()=>{
 const original=JSON.stringify(inputs);const r=businessPlan(inputs,{pricesIncludeTax:false},a);
 expect(r.plan).toMatchObject({fixedPerOrder:200,targetProfit:2000,maxTargetCac:3500,perOrder:3500,monthly:350000,breakEvenOrders:6});
 expect(r.cash?.amount).toBe(238000);expect(JSON.stringify(inputs)).toBe(original);
 expect(r.stress?.complete&&r.stress.netProfit).toBe(2600);
});
it('keeps missing planning assumptions and essential financial inputs unknown',()=>{
 expect(businessPlan(inputs,{pricesIncludeTax:false},{...a,monthlyFixed:null}).plan).toBeNull();
 const r=businessPlan({...inputs,cac:{value:null,status:'UNKNOWN'}},{pricesIncludeTax:false},a);expect(r.base.complete).toBe(false);expect(r.stress).toBeNull();expect(r.cash).toBeNull();
});
it('flags impossible targets and non-covering unit economics; does not divide by zero',()=>{
 const r=businessPlan(inputs,{pricesIncludeTax:false},{...a,targetMarginBp:9000});expect(r.plan!.maxTargetCac).toBeLessThan(0);
 const loss=businessPlan({...inputs,cac:{value:9000,status:'ESTIMATED'}},{pricesIncludeTax:false},a);expect(loss.plan?.breakEvenOrders).toBeNull();
 expect(()=>businessPlan(inputs,{pricesIncludeTax:false},{...a,monthlyOrders:0})).toThrow();expect(()=>businessPlan(inputs,{pricesIncludeTax:false},{...a,targetMarginBp:10001})).toThrow();
});
it('rounds overhead conservatively and keeps tax outside the margin target',()=>{
 const r=businessPlan({...inputs,taxRate:{value:2000,status:'ESTIMATED'}},{pricesIncludeTax:true},{...a,monthlyFixed:100,monthlyOrders:3});
 expect(r.base.complete&&r.base.revenue).toBe(8333);
 expect(r.plan?.fixedPerOrder).toBe(34);
 expect(r.plan?.targetProfit).toBe(1667);
 expect(r.plan?.monthly).toBe(r.plan!.perOrder*3);
 expect(businessPlan(inputs,{pricesIncludeTax:false},{...a,cashReserve:null}).cash).toBeNull();
});
it('rejects unsafe cash forecasts instead of showing imprecise money',()=>{
 expect(()=>businessPlan(inputs,{pricesIncludeTax:false},{...a,payoutDays:2_000_000_000,dailyOrders:2_000_000_000})).toThrow('supported range');
});
it('combines return losses with price and acquisition stress, capped at 100 percent returns',()=>{
 const cost={value:5000,status:'ESTIMATED'} as const;
 const r=businessPlan({...inputs,returnRatePct:{value:500,status:'ESTIMATED'},returnCostPerReturn:cost},{pricesIncludeTax:false},a);
 expect(r.base.complete&&r.base.netProfit).toBe(3750);
 expect(r.stress?.complete&&r.stress.netProfit).toBe(2250);
 const capped=businessPlan({...inputs,returnRatePct:{value:9900,status:'ESTIMATED'},returnCostPerReturn:cost},{pricesIncludeTax:false},a);
 expect(capped.stress?.complete&&capped.stress.netProfit).toBe(-2400);
});
