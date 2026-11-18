import { useState } from "react";
import { useCart } from "../context/CartContext";
import { formatMoney } from "../utils";

export default function ProductCard({ product, onPriceChange }) {
  const { cart, inCart, addToCart } = useCart();
  const [editing, setEditing] = useState(false);
  const [newPrice, setNewPrice] = useState(product.current_price);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const added = inCart(product.id);

  async function handleAdd() {
    try {
      setBusy(true);
      await addToCart(product);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSavePrice() {
    if (!newPrice || Number(newPrice) <= 0) {
      setError("Enter a valid price.");
      return;
    }
    try {
      setBusy(true);
      await onPriceChange(product.id, newPrice);
      setEditing(false);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const diff =
    product.previous_price !== null
      ? Number(product.current_price) - Number(product.previous_price)
      : 0;

  return (
    <div className="card product-card">
      {product.image ? (
        <img src={product.image} alt={product.name} className="product-img" />
      ) : (
        <div className="product-img placeholder">🛍️</div>
      )}

      <div className="product-body">
        <h3>{product.name}</h3>
        <p className="muted">
          {product.category_name || "Uncategorised"} · per {product.unit}
        </p>

        {editing ? (
          <div className="price-edit">
            <input
              type="number"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              autoFocus
            />
            <button onClick={handleSavePrice} disabled={busy}>
              Save
            </button>
            <button
              className="secondary"
              onClick={() => {
                setEditing(false);
                setNewPrice(product.current_price);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="price-row">
            <span className="price">{formatMoney(product.current_price)}</span>
            {product.price_trend !== "same" && (
              <span className={`trend ${product.price_trend}`}>
                {product.price_trend === "up" ? "▲" : "▼"}{" "}
                {formatMoney(Math.abs(diff))}
              </span>
            )}
            <button className="link-btn" onClick={() => setEditing(true)}>
              Edit price
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <button
          className="add-btn"
          onClick={handleAdd}
          disabled={busy || !cart || added}
        >
          {added ? "✓ In cart" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
