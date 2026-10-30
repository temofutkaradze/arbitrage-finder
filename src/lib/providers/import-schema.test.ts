import { expect,it } from "vitest";
import { parseOfferImport } from "./import-schema";
const now=new Date("2026-10-30T12:00:00Z");
const row={title:"Product",merchant:"Seller",url:"https://example.com/p",priceMinor:1234,observedAt:"2026-10-30T11:00:00Z",expiresAt:"2026-10-31T10:00:00Z"};
const batch=(offers:unknown[])=>JSON.stringify({destinationCountry:"US",currency:"USD",offers});
it("accepts a bounded current packet without reviewed status or invented shipping",()=>{expect(parseOfferImport(batch([row]),now).offers[0]).toEqual(row);});
it("rejects unsupported fields and unsafe/duplicate URLs",()=>{
 for(const offers of [[{...row,state:"ACCEPTED"}],[{...row,url:"javascript:alert(1)"}],[row,{...row,url:row.url+"#fragment"}]])expect(()=>parseOfferImport(batch(offers),now)).toThrow();
});
it("rejects expired, future and excessive review windows",()=>{
 for(const patch of [{expiresAt:"2026-10-30T12:00:00Z"},{observedAt:"2026-10-30T13:00:00Z"},{expiresAt:"2026-11-02T12:00:00Z"}])expect(()=>parseOfferImport(batch([{...row,...patch}]),now)).toThrow();
});
it("rejects empty/oversized batches, invalid money and excessive bytes",()=>{
 for(const rows of [[],Array.from({length:51},(_,i)=>({...row,url:`https://example.com/${i}`})),[{...row,priceMinor:1.5}],[{...row,priceMinor:-1}]])expect(()=>parseOfferImport(batch(rows),now)).toThrow();
 expect(()=>parseOfferImport(" ".repeat(200001),now)).toThrow("200 KB");
});
