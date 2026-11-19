import { formatMoney } from "../utils";

export default function BarList({ rows, labelKey, valueKey }) {
  const max = Math.max(...rows.map((r) => Number(r[valueKey])), 1);
  return (
    <div className="barlist">
      {rows.map((r) => {
        const value = Number(r[valueKey]);
        return (
          <div key={r[labelKey]} className="barlist-row">
            <span className="barlist-label">{r[labelKey]}</span>
            <div className="barlist-track">
              <div
                className="barlist-fill"
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
            <span className="barlist-value">{formatMoney(value)}</span>
          </div>
        );
      })}
    </div>
  );
}
