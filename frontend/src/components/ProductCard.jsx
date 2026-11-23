import { useState } from "react";
import { Apple, Check, Pencil, Plus, TrendingDown, TrendingUp } from "lucide-react";
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
      setError("Enter a price above zero.");
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
    <article className="product">
      <div className="product-photo">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-placeholder" aria-hidden="true">
            <Apple size={40} />
          </div>
        )}
        {product.category_name && <span className="product-cat">{product.category_name}</span>}
      </div>

      <div className="product-body">
        <h3>{product.name}</h3>
        <p className="muted">per {product.unit}</p>

        {editing ? (
          <div className="price-edit">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSavePrice()}
              aria-label={`New price for ${product.name}`}
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
            <span className="tag">{formatMoney(product.current_price)}</span>
            {product.price_trend !== "same" && (
              <span className={`trend ${product.price_trend}`}>
                {product.price_trend === "up" ? (
                  <TrendingUp size={16} aria-label="Price went up" />
                ) : (
                  <TrendingDown size={16} aria-label="Price went down" />
                )}
                {formatMoney(Math.abs(diff))}
              </span>
            )}
            <button
              className="icon-btn"
              onClick={() => setEditing(true)}
              aria-label={`Edit price of ${product.name}`}
              title="Edit price"
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <button
          className={added ? "add-btn added" : "add-btn"}
          onClick={handleAdd}
          disabled={busy || !cart || added}
        >
          {added ? (
            <>
              <Check size={18} aria-hidden="true" /> In cart
            </>
          ) : (
            <>
              <Plus size={18} aria-hidden="true" /> Add to cart
            </>
          )}
        </button>
      </div>
    </article>
  );
}
