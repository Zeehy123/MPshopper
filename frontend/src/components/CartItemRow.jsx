import { useState } from "react";
import { Apple, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatMoney } from "../utils";

export default function CartItemRow({ item }) {
  const { updateItem, removeItem } = useCart();
  const [qty, setQty] = useState(item.quantity);
  const [price, setPrice] = useState(item.price_paid);
  const [error, setError] = useState("");

  async function save(field, value) {
    if (!value || Number(value) <= 0) {
      setError("Must be more than zero.");
      setQty(item.quantity);
      setPrice(item.price_paid);
      return;
    }
    if (Number(value) === Number(item[field])) return; // nothing changed
    try {
      setError("");
      await updateItem(item.id, { [field]: value });
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleBought(event) {
    try {
      setError("");
      await updateItem(item.id, { is_bought: event.target.checked });
    } catch (e) {
      setError(e.message);
    }
  }

  const onEnter = (e) => e.key === "Enter" && e.target.blur();

  return (
    <div className={`cart-row${item.is_bought ? " bought" : ""}`}>
      {item.product_image ? (
        <img src={item.product_image} alt="" className="cart-img" />
      ) : (
        <div className="cart-img placeholder" aria-hidden="true">
          <Apple size={24} />
        </div>
      )}

      <div className="cart-info">
        <h3>{item.product_name}</h3>
        <p className="muted">per {item.product_unit}</p>
        <label className="cart-bought">
          <input
            type="checkbox"
            checked={Boolean(item.is_bought)}
            onChange={toggleBought}
            aria-label={`Mark ${item.product_name} as bought`}
          />
          Bought
        </label>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="cart-fields">
        <label>
          Quantity
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => save("quantity", qty)}
            onKeyDown={onEnter}
          />
        </label>
        <label>
          Price (₦)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onBlur={() => save("price_paid", price)}
            onKeyDown={onEnter}
          />
        </label>
        <div className="cart-total">{formatMoney(item.line_total)}</div>
      </div>

      <button
        className="icon-btn danger cart-del"
        onClick={() => removeItem(item.id)}
        aria-label={`Remove ${item.product_name}`}
        title="Remove"
      >
        <Trash2 size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
