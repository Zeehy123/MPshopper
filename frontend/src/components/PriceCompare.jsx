import { useEffect, useState } from "react";
import { api } from "../api";
import { formatMoney } from "../utils";

export default function PriceCompare() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState("");
  const [rows, setRows] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getProducts()
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selected) {
      setRows([]);
      setHistory([]);
      return;
    }
    Promise.all([api.getStorePrices(selected), api.getPriceHistory(selected)])
      .then(([prices, hist]) => {
        setRows(prices);
        setHistory(hist);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [selected]);

  return (
    <div className="card">
      <h2>Where is it cheapest?</h2>
      <select value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">Choose a product...</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} (per {p.unit})
          </option>
        ))}
      </select>

      {error && <p className="error">{error}</p>}

      {selected && rows.length > 0 && (
        <>
          <table className="trip-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Last price</th>
                <th>Recorded</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.store}
                  className={i === 0 && rows.length > 1 ? "cheapest" : ""}
                >
                  <td>
                    {r.store}
                    {i === 0 && rows.length > 1 && " ✓ cheapest"}
                  </td>
                  <td>{formatMoney(r.price)}</td>
                  <td>{new Date(r.recorded_at).toLocaleDateString("en-NG")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 1 && (
            <p className="muted">
              Only one store recorded so far. Pick a store when you finish trips
              elsewhere to compare.
            </p>
          )}
        </>
      )}

      {selected && history.length > 0 && (
        <details>
          <summary>Price history ({history.length})</summary>
          <table className="trip-table">
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.recorded_at).toLocaleDateString("en-NG")}</td>
                  <td>{h.store_name || "Unknown store"}</td>
                  <td>{formatMoney(h.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
