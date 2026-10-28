import { INPUT_DEFS, type InputKey, type Inputs } from "@/lib/profit/types";
import { toDisplay } from "@/lib/profit/format";

export function InputFields({ keys, values, currency }: { keys: readonly InputKey[]; values: Inputs; currency: string }) {
  return (
    <div className="wrap">
      <table>
        <thead><tr><th>Input</th><th>Value</th><th>Status</th><th>Note / source</th></tr></thead>
        <tbody>
          {INPUT_DEFS.filter((d) => keys.includes(d.key)).map((d) => {
            const v = values[d.key];
            const unit = d.unit === "money" ? currency : d.unit === "percent" ? "%" : "units";
            return (
              <tr key={d.key}>
                <td className="l">{d.label}{d.essential && <span className="req" title="Required for a profit figure"> *</span>}</td>
                <td><input name={`${d.key}__value`} type="text" inputMode="decimal" defaultValue={toDisplay(d.unit, v?.value)} size={9} aria-label={d.label} /> <span className="mut">{unit}</span></td>
                <td>
                  <select name={`${d.key}__status`} defaultValue={v?.value != null ? v.status : "UNKNOWN"} aria-label={`${d.label} status`}>
                    <option value="VERIFIED">Verified</option><option value="ESTIMATED">Estimate</option><option value="UNKNOWN">Unknown</option>
                  </select>
                </td>
                <td><input name={`${d.key}__note`} type="text" defaultValue={v?.note ?? ""} placeholder="where this number comes from" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
