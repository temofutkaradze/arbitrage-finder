"use client";
import { useState } from "react";
import { parseGel, paymentScenario } from "@/lib/payments/scenario";
const money = (n: number) => `${(n / 100).toFixed(2)} GEL`;
export function PaymentScenario() {
  const [values, setValues] = useState({ domestic: "", foreign: "", apple: "0" });
  let result: ReturnType<typeof paymentScenario> | null = null, error = "";
  if (values.domestic !== "" && values.foreign !== "") {
    try { result = paymentScenario(parseGel(values.domestic), parseGel(values.foreign), parseGel(values.apple)); }
    catch(e) { error = e instanceof Error ? e.message : "შეამოწმე თანხები."; }
  }
  return <section className="card"><h2>თვიური სცენარი — GEL</h2>
    <p>ეს არის დაუმახსოვრებელი სცენარი. შეიყვანე მოსალოდნელი თვიური ბრუნვა, არა მოგება. თანხები შენს პროდუქტებსა და შეფასებებში არ გადაიტანება.</p>
    <div className="grid">{([ ["domestic", "ქართული ბარათების ბრუნვა"], ["foreign", "უცხოური ბარათების ბრუნვა"], ["apple", "მათ შორის Apple Pay ბრუნვა"] ] as const).map(([key,label]) => <label key={key}>{label}<input type="text" inputMode="decimal" value={values[key]} onChange={e => setValues({...values,[key]:e.target.value})}/></label>)}</div>
    {error && <p role="alert">{error}</p>}
    {!result && !error && <p>შეავსე ორივე ბარათის ბრუნვა; თუ გაყიდვა არ იგეგმება, მიუთითე 0.</p>}
    {result && <div aria-live="polite"><h3>სცენარის შედეგი</h3><ul>
      <li>ბარათების პროცენტული საკომისიო: {money(result.baseFee)}</li>
      <li>50 GEL მინიმუმამდე შევსება: {money(result.topUp)}</li>
      <li>Apple Pay დამატება: {money(result.appleExtra)}</li>
      <li>მოდელირებული თვიური საკომისიო: <b>{money(result.fees)}</b></li>
      <li>ამ თვის უცხოური ბრუნვის 10% რეზერვი: {money(result.monthlyReserve)}</li>
      <li>ექვსი თანაბარი თვის დაგროვილი რეზერვის მაგალითი: {money(result.sixMonthReserve)}</li>
    </ul><p>რეზერვი დროებით მიუწვდომელი თანხაა და ხარჯებში არ შედის. ექვსთვიანი მაგალითი გულისხმობს უცვლელ ბრუნვას, გათავისუფლებამდე ექვს შეკავებას და არ ითვლის დაბრუნებებსა და ბანკის ინდივიდუალურ პირობებს. ცალკე გამოქვეყნებული 500 GEL ამ შედეგებში არ შედის.</p></div>}
    <p className="mut">მოდელის ვარაუდი: მინიმუმი ეხება ბარათების საბაზო საკომისიოს; Apple Pay დამატებულია ცალკე. ბანკთან დაადასტურე, ითვლება თუ არა ეს დამატება მინიმუმის შესავსებად. შედეგი თვიურ ჯამებზე მრგვალდება; ტრანზაქციების მიხედვით დათვლილმა ანგარიშმა შეიძლება განსხვავებული თანხა მისცეს.</p>
  </section>;
}
