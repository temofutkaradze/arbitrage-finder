import {expect,it} from "vitest";
import {normalizeNbg,validRateDate,georgiaDay} from "./reference";
const now=new Date("2026-10-28T18:00:00Z");
function feed(day="2026-10-28"){
 return [{date:`${day}T00:00:00.000Z`,currencies:[['USD',2,5.2],['EUR',1,3.25],['GBP',1,4],['CAD',10,20],['AUD',1,1.5]].map(([code,quantity,rate])=>({code,quantity,rate,validFromDate:`${day}T00:00:00.000Z`}))}];
}
it("honours per-currency quantities and derives target units per USD",()=>{
 const rows=normalizeNbg(feed(),now);expect(rows).toHaveLength(6);
 expect(rows.find(r=>r.currency==="USD")?.rate).toBe("1.00000000");
 expect(rows.find(r=>r.currency==="EUR")?.rate).toBe("0.80000000");
 expect(rows.find(r=>r.currency==="GEL")?.rate).toBe("2.60000000");
 expect(rows.find(r=>r.currency==="CAD")?.rate).toBe("1.30000000");
});
it("rejects future-effective and stale feeds, even if already published",()=>{
 expect(()=>normalizeNbg(feed("2026-10-29"),now)).toThrow();
 expect(()=>normalizeNbg(feed("2026-10-01"),now)).toThrow();
});
it("rejects inconsistent, duplicate and missing currency data",()=>{
 const data=feed();data[0].currencies[0].validFromDate="2026-10-29T00:00:00Z";expect(()=>normalizeNbg(data,now)).toThrow();
 const duplicate=feed();duplicate[0].currencies.push(duplicate[0].currencies[0]);expect(()=>normalizeNbg(duplicate,now)).toThrow();
 const missing=feed();missing[0].currencies.shift();expect(()=>normalizeNbg(missing,now)).toThrow();
});
it("uses the Georgian calendar date at the UTC midnight boundary",()=>{
 const date=new Date("2026-10-28T21:00:00Z");expect(georgiaDay(date)).toBe("2026-10-29");
 expect(validRateDate(new Date("2026-10-29T00:00:00Z"),date)).toBe(true);
 expect(validRateDate(new Date("2026-10-30T00:00:00Z"),date)).toBe(false);
 expect(validRateDate(new Date("invalid"),date)).toBe(false);
});
