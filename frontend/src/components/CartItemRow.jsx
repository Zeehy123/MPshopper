import { useState, useEffect } from "react";
import { Apple, Trash2 } from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatMoney } from "../utils";

export default function CartItemRow({ item }) {
  const { updateItem, removeItem } = useCart();
  const [qty, setQty] = useState(item.quantity);
  const [price, setPrice] = useState(item.price_paid);
  const [error, setError] = useState("");

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

  async function toggleBought(e) {
    try {
      setError("");
      await updateItem(item.id, { checked: e.target.checked });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={item.checked ? "cart-row bought" : "cart-row"}>
      <label className="cart-check">
        <input
          type="checkbox"
          checked={!!item.checked}
          onChange={toggleBought}
          aria-label={`Mark ${item.product_name} as bought`}
        />
      </label>

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
