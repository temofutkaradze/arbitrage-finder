import { z } from "zod";
import { CURRENCIES } from "../discovery/schema";
export const NBG_URL = "https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/";
export function georgiaDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Tbilisi",year:"numeric",month:"2-digit",day:"2-digit" }).format(now);
}
export function validRateDate(date: Date, now=new Date()) {
  if(!Number.isFinite(date.getTime()))return false;
  const today=georgiaDay(now),day=date.toISOString().slice(0,10);
  return day<=today && Date.parse(`${today}T00:00:00Z`)-date.getTime()<=7*86400000;
}
const unit=BigInt(100000000);
function decimal(value:unknown) {
  const s=String(value);
  if(!/^\d{1,6}(\.\d{1,8})?$/.test(s))throw new Error("FX invalid decimal");
  const [whole,fraction=""]=s.split(".");const result=BigInt(whole)*unit+BigInt(fraction.padEnd(8,"0"));
  if(result<=BigInt(0))throw new Error("FX nonpositive rate");return result;
}
export function normalizeNbg(payload:unknown, now=new Date()) {
  const feeds=z.array(z.object({date:z.iso.datetime(),currencies:z.array(z.unknown())})).min(1).max(20).parse(payload);
  const eligible=feeds.filter(f=>validRateDate(new Date(f.date),now)).sort((a,b)=>b.date.localeCompare(a.date));
  if(!eligible.length)throw new Error("FX no current reference date available");
  const feed=eligible[0],date=new Date(feed.date),rates=new Map<string,{quantity:number;rate:bigint}>();
  for(const raw of feed.currencies){
    const header=z.object({code:z.string()}).parse(raw);
    if(!(CURRENCIES as readonly string[]).includes(header.code))continue;
    const row=z.object({code:z.string(),quantity:z.number().int().min(1).max(1000000),rate:z.union([z.number(),z.string()]),validFromDate:z.iso.datetime()}).parse(raw);
    if(row.validFromDate.slice(0,10)!==feed.date.slice(0,10)||rates.has(row.code))throw new Error("FX inconsistent source dates or duplicate currency");
    rates.set(row.code,{quantity:row.quantity,rate:decimal(row.rate)});
  }
  rates.set("GEL",{quantity:1,rate:unit});
  const usd=rates.get("USD");if(!usd)throw new Error("FX USD reference is missing");
  return CURRENCIES.map(currency=>{
    const target=rates.get(currency);if(!target)throw new Error("FX target reference missing");
    const denominator=BigInt(usd.quantity)*target.rate;
    const numerator=usd.rate*BigInt(target.quantity)*unit;
    const rounded=(numerator*BigInt(2)+denominator)/(denominator*BigInt(2));
    if(rounded<=BigInt(0)||rounded>=BigInt(1000000)*unit)throw new Error("FX derived rate outside supported range");
    const rate=`${rounded/unit}.${String(rounded%unit).padStart(8,"0")}`;
    return {provider:"NBG",currency,rate,rateDate:date,sourceUrl:`${NBG_URL}?date=${feed.date.slice(0,10)}`};
  });
}
