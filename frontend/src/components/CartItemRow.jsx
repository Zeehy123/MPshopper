import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { formatMoney } from "../utils";

export default function CartItemRow({ item }) {
  const { updateItem, removeItem } = useCart();
  const [qty, setQty] = useState(item.quantity);
  const [price, setPrice] = useState(item.price_paid);
  const [error, setError] = useState("");

  // keep inputs in sync when the server sends fresh values
  useEffect(() => {
    setQty(item.quantity);
    setPrice(item.price_paid);
  }, [item.quantity, item.price_paid]);

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

  const onEnter = (e) => e.key === "Enter" && e.target.blur();

  return (
    <div className="card cart-row">
      {item.product_image ? (
        <img src={item.product_image} alt="" className="cart-img" />
      ) : (
        <div className="cart-img placeholder">🛍️</div>
      )}

      <div className="cart-info">
        <h3>{item.product_name}</h3>
        <p className="muted">per {item.product_unit}</p>
        {error && <p className="error">{error}</p>}
      </div>

      <label className="cart-field">
        Qty
        <input
          type="number"
          min="0"
          step="0.01"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={() => save("quantity", qty)}
          onKeyDown={onEnter}
        />
      </label>

      <label className="cart-field">
        Price (₦)
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={() => save("price_paid", price)}
          onKeyDown={onEnter}
        />
      </label>

      <div className="cart-total">{formatMoney(item.line_total)}</div>

      <button
        className="danger"
        onClick={() => removeItem(item.id)}
        aria-label="Remove"
      >
        ✕
      </button>
    </div>
  );
}
