"use client";
import { useMemo, useState } from "react";
import { calculate } from "@/lib/profit/calculate";
import { formatMoney, formatPct, parseInput } from "@/lib/profit/format";
import { INPUT_DEFS, type InputKey, type Inputs } from "@/lib/profit/types";

export function Calculator({ initial, pricesIncludeTax, currency }: { initial: Record<InputKey, string>; pricesIncludeTax: boolean; currency: string }) {
  const [vals, setVals] = useState(initial);
  const result = useMemo(() => {
    const inputs: Inputs = {};
    for (const d of INPUT_DEFS) {
      const p = parseInput(d.unit, vals[d.key] ?? "");
      inputs[d.key] = p.value === null || p.error ? { value: null, status: "UNKNOWN" } : { value: p.value, status: "ESTIMATED" };
    }
    return calculate(inputs, { pricesIncludeTax });
  }, [vals, pricesIncludeTax]);
  const m = (n: number) => formatMoney(n, currency);
  return (
    <div>
      <p className="mut">What-if scratchpad: changes here are not saved. Every number you type is treated as an estimate.</p>
      <div className="grid">
        {INPUT_DEFS.map((d) => (
          <label key={d.key}>{d.label}{d.essential ? " *" : ""}
            <input type="text" inputMode="decimal" value={vals[d.key] ?? ""} onChange={(e) => setVals({ ...vals, [d.key]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="bar"><button type="button" onClick={() => setVals(initial)}>Reset to saved values</button></div>
      {!result.complete ? (
        <p className="warn">No profit shown: required inputs are missing ({result.missing.map((k) => INPUT_DEFS.find((d) => d.key === k)!.label).join(", ")}).</p>
      ) : (
        <div className="cards">
          <div><span className="mut">Contribution after ads / order</span><b className={result.netProfit >= 0 ? "pos" : "neg"}>{m(result.netProfit)}</b></div>
          <div><span className="mut">Margin</span><b>{formatPct(result.margin)}</b></div>
          <div><span className="mut">Return on capital</span><b>{formatPct(result.roi)}</b></div>
          <div><span className="mut">Max affordable CAC</span><b>{m(result.maxAffordableCac)}</b></div>
          <div><span className="mut">Break-even price</span><b>{result.breakEvenPrice === null ? "n/a" : m(result.breakEvenPrice)}</b></div>
          <div><span className="mut">Break-even ROAS</span><b>{result.breakEvenRoas === null ? "n/a" : result.breakEvenRoas.toFixed(2) + "x"}</b></div>
        </div>
      )}
    </div>
  );
}
