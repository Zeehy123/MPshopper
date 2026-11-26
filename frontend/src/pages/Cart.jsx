import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Plus, ShoppingBasket } from "lucide-react";
import { api } from "../api";
import { useCart } from "../context/CartContext";
import CartItemRow from "../components/CartItemRow";
import { formatMoney } from "../utils";

export default function Cart() {
  const { cart, error, updateTrip, finishShopping } = useCart();
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [newStore, setNewStore] = useState("");
  const [budget, setBudget] = useState("");
  const [message, setMessage] = useState("");
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    api
      .getStores()
      .then(setStores)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cart) setBudget(cart.budget ?? "");
  }, [cart?.budget]);

  if (error) return <p className="error">Could not load cart: {error}</p>;
  if (!cart) return <p className="muted">Loading...</p>;

  async function saveBudget() {
    const value = budget === "" ? null : budget;
    if (value !== null && Number(value) < 0)
      return setMessage("Budget cannot be negative.");
    if (String(value ?? "") === String(cart.budget ?? "")) return;
    try {
      setMessage("");
      await updateTrip({ budget: value });
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function changeStore(e) {
    try {
      setMessage("");
      await updateTrip({ store: e.target.value || null });
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function addStore() {
    const name = newStore.trim();
    if (!name) return;
    try {
      const created = await api.createStore({ name });
      setStores((list) => [...list, created]);
      setNewStore("");
      await updateTrip({ store: created.id });
    } catch (e) {
      setMessage(e.message);
    }
  }

  const total = cart.items.length;
  const leftItems = cart.items.filter((i) => !i.checked);
  const leftAmount = leftItems.reduce((sum, i) => sum + Number(i.line_total), 0);

  async function handleFinish() {
    const where = cart.store_name ? ` at ${cart.store_name}` : "";
    const unticked =
      leftItems.length > 0
        ? `\n\n${leftItems.length} ${leftItems.length === 1 ? "item is" : "items are"} not ticked off yet.`
        : "";
    if (
      !window.confirm(
        `Finish this trip${where}? Prices you changed will be saved.${unticked}`,
      )
    )
      return;
    try {
      setFinishing(true);
      setMessage("");
      await finishShopping();
      navigate("/history");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setFinishing(false);
    }
  }

  const percent =
    cart.budget && Number(cart.budget) > 0
      ? Math.min(100, (Number(cart.total) / Number(cart.budget)) * 100)
      : 0;

  return (
    <>
      <h1>Shopping cart</h1>

      <div className="cart-layout">
        <div>
          {cart.items.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">
                <ShoppingBasket size={28} aria-hidden="true" />
              </span>
              <p>Your cart is empty.</p>
              <Link to="/" className="btn-link">
                Pick items from your shelf
              </Link>
            </div>
          ) : (
            <div className="cart-list">
              {cart.items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        <aside className="summary">
          <h2>This trip</h2>

          {total > 0 && (
            <p className="muted bought-progress" aria-live="polite">
              {leftItems.length === 0
                ? `All ${total} ${total === 1 ? "item" : "items"} bought`
                : `${total - leftItems.length} of ${total} bought · ${leftItems.length} left (${formatMoney(leftAmount)})`}
            </p>
          )}

          <label>
            Store
            <select value={cart.store ?? ""} onChange={changeStore}>
              <option value="">Not specified</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <div className="inline-add">
            <input
              placeholder="New store name"
              aria-label="New store name"
              value={newStore}
              onChange={(e) => setNewStore(e.target.value)}
            />
            <button type="button" className="secondary" onClick={addStore}>
              <Plus size={18} aria-hidden="true" /> Add
            </button>
          </div>

          <label>
            Budget (₦)
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="No budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              onBlur={saveBudget}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            />
          </label>

          {cart.budget && (
            <div>
              <div className="bar">
                <div className={`bar-fill ${cart.budget_status}`} style={{ width: `${percent}%` }} />
              </div>
              <p className={`budget-text ${cart.budget_status}`}>
                {cart.over_budget
                  ? `${formatMoney(Math.abs(cart.remaining))} over budget`
                  : `${formatMoney(cart.remaining)} left`}
                {cart.budget_status === "near" && ". Almost at your limit."}
              </p>
            </div>
          )}

          <div className="grand-total">
            <span>Total</span>
            <strong>{formatMoney(cart.total)}</strong>
          </div>

          {message && <p className="error">{message}</p>}

          <button onClick={handleFinish} disabled={finishing || cart.items.length === 0}>
            <Check size={18} aria-hidden="true" /> {finishing ? "Saving" : "Finish shopping"}
          </button>
        </aside>
      </div>
    </>
  );
}
