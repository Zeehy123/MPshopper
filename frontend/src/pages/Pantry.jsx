import { useCallback, useEffect, useState } from "react";
import { Apple, Minus, Plus, Trash2 } from "lucide-react";
import { api } from "../api";
import { useCart } from "../context/CartContext";
import { useSync } from "../useSync";

function PantryRow({ row, onChange, onRemove, setError }) {
  const [qty, setQty] = useState(String(row.quantity));
  const [low, setLow] = useState(String(row.low_at));

  async function commit(data) {
    try {
      setError("");
      await api.updatePantry(row.id, data);
      await onChange();
    } catch (e) {
      setError(e.message);
      setQty(String(row.quantity));
      setLow(String(row.low_at));
    }
  }

  const step = (delta) => commit({ quantity: Math.max(0, Number(row.quantity) + delta) });
  const onEnter = (e) => e.key === "Enter" && e.target.blur();

  return (
    <li className={row.is_low ? "pantry-row low" : "pantry-row"}>
      <div className="pantry-photo">
        {row.image ? (
          <img src={row.image} alt="" />
        ) : (
          <Apple size={22} aria-hidden="true" />
        )}
      </div>

      <div className="pantry-info">
        <h3>{row.name}</h3>
        <p className="muted">
          {row.unit}
          {row.is_low && <span className="badge-low">Running low</span>}
        </p>
      </div>

      <div className="pantry-controls">
        <div className="stepper" role="group" aria-label={`Amount of ${row.name} at home`}>
          <button
            type="button"
            className="secondary step-btn"
            onClick={() => step(-1)}
            disabled={Number(row.quantity) <= 0}
            aria-label={`One less ${row.name}`}
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <input
            inputMode="decimal"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => qty !== String(row.quantity) && commit({ quantity: qty })}
            onKeyDown={onEnter}
            aria-label={`Amount of ${row.name} at home`}
          />
          <button
            type="button"
            className="secondary step-btn"
            onClick={() => step(1)}
            aria-label={`One more ${row.name}`}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
        </div>

        <label className="pantry-low">
          Low at
          <input
            inputMode="decimal"
            value={low}
            onChange={(e) => setLow(e.target.value)}
            onBlur={() => low !== String(row.low_at) && commit({ low_at: low })}
            onKeyDown={onEnter}
          />
        </label>
      </div>

      <button
        type="button"
        className="icon-btn danger"
        onClick={() => onRemove(row)}
        aria-label={`Stop tracking ${row.name}`}
        title="Stop tracking"
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </li>
  );
}

export default function Pantry() {
  const { inCart, addToCart } = useCart();
  const { dataVersion } = useSync();
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pick, setPick] = useState({ product: "", quantity: "0", low_at: "1" });

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let live = true;
    Promise.all([api.getPantry(), api.getProducts()])
      .then(([pantry, all]) => {
        if (!live) return;
        setRows(pantry);
        setProducts(all);
        setLoading(false);
      })
      .catch((e) => {
        if (!live) return;
        setError(e.message);
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [dataVersion, reloadKey]);

  const tracked = new Set(rows.map((r) => r.product));
  const untracked = products.filter((p) => !tracked.has(p.id));
  const toBuy = rows.filter((r) => r.is_low && !inCart(r.product));

  async function handleTrack(e) {
    e.preventDefault();
    if (!pick.product) return setError("Choose a product first.");
    try {
      setError("");
      await api.trackPantry(pick);
      setPick({ product: "", quantity: "0", low_at: "1" });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(row) {
    if (!window.confirm(`Stop tracking "${row.name}" in your pantry? The product itself stays on your shelf.`)) return;
    try {
      await api.removePantry(row.id);
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRestock() {
    try {
      setError("");
      for (const r of toBuy) {
        await addToCart({ id: r.product, default_quantity: r.default_quantity });
      }
      setNotice(`Added ${toBuy.length} ${toBuy.length === 1 ? "item" : "items"} to your cart.`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;

  return (
    <>
      <h1>Pantry</h1>
      <p className="muted">
        What you have at home. When you finish a shopping trip, what you bought is added here
        automatically.
      </p>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {toBuy.length > 0 && (
        <div className="card restock">
          <p>
            <strong>{toBuy.length}</strong> {toBuy.length === 1 ? "item is" : "items are"} running
            low and not in your cart.
          </p>
          <button type="button" onClick={handleRestock}>
            Add to cart
          </button>
        </div>
      )}

      <form className="card form" onSubmit={handleTrack}>
        <h2>Track a product</h2>
        {products.length === 0 ? (
          <p className="muted">Add some products to your shelf first.</p>
        ) : untracked.length === 0 ? (
          <p className="muted">Every product on your shelf is already in your pantry.</p>
        ) : (
          <>
            <label>
              Product
              <select
                value={pick.product}
                onChange={(e) => setPick((p) => ({ ...p, product: e.target.value }))}
              >
                <option value="">Choose a product</option>
                {untracked.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.unit})
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                How many do you have now?
                <input
                  inputMode="decimal"
                  value={pick.quantity}
                  onChange={(e) => setPick((p) => ({ ...p, quantity: e.target.value }))}
                />
              </label>
              <label>
                Running low at
                <input
                  inputMode="decimal"
                  value={pick.low_at}
                  onChange={(e) => setPick((p) => ({ ...p, low_at: e.target.value }))}
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit">Add to pantry</button>
            </div>
          </>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="muted">Nothing tracked yet.</p>
      ) : (
        <ul className="pantry-list">
          {rows.map((r) => (
            <PantryRow
              key={`${r.id}:${r.quantity}:${r.low_at}`} // a new amount from a sync resets the boxes
              row={r}
              onChange={reload}
              onRemove={handleRemove}
              setError={setError}
            />
          ))}
        </ul>
      )}
    </>
  );
}
