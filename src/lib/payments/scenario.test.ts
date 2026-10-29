import { it, expect } from "vitest";
import { parseGel, paymentScenario } from "./scenario";
it("tops up to the minimum without charging it twice", () => {
 expect(paymentScenario(100000,0,0).fees).toBe(5000);
 expect(paymentScenario(1000000,0,0).fees).toBe(20000);
 expect(paymentScenario(250000,0,0).topUp).toBe(0);
 expect(paymentScenario(0,0,0).fees).toBe(5000);
});
it("separates mixed card fees, Apple Pay and withheld funds", () => {
 const r = paymentScenario(100000,200000,50000);
 expect(r.baseFee).toBe(7000);expect(r.appleExtra).toBe(200);
 expect(r.fees).toBe(7200);expect(r.monthlyReserve).toBe(20000);expect(r.sixMonthReserve).toBe(120000);
});
it("rejects invalid inputs and a wallet volume exceeding total turnover", () => {
 for (const n of [-1,NaN,Infinity,1.5,100000001]) expect(()=>paymentScenario(n,0,0)).toThrow();
 expect(()=>paymentScenario(0,0,1)).toThrow();
 for (const s of ["","-1","1e3","1.001","1,00"]) expect(()=>parseGel(s)).toThrow();
 expect(parseGel("12.05")).toBe(1205);
});
