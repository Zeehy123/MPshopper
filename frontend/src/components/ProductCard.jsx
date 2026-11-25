import { useState } from "react";
import {
  Apple,
  Check,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { formatMoney } from "../utils";

export default function ProductCard({
  product,
  categories,
  onUpdate,
  onDelete,
}) {
  const { cart, inCart, addToCart } = useCart();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const added = inCart(product.id);
  const updateDraft = (field) => (event) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }));

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

  function startEditing() {
    setDraft({
      name: product.name,
      unit: product.unit,
      category: product.category ?? "",
      default_quantity: product.default_quantity,
      current_price: product.current_price,
    });
    setEditing(true);
    setError("");
  }

  async function handleSave() {
    if (!draft.name.trim() || !draft.unit.trim()) {
      setError("Name and unit are required.");
      return;
    }
    if (
      !(Number(draft.current_price) > 0) ||
      !(Number(draft.default_quantity) > 0)
    ) {
      setError("Price and default quantity must be above zero.");
      return;
    }
    try {
      setBusy(true);
      await onUpdate(product.id, draft);
      setEditing(false);
      setDraft(null);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`))
      return;
    try {
      setBusy(true);
      setError("");
      await onDelete(product.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function cancelEditing() {
    setEditing(false);
    setDraft(null);
    setError("");
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
          <form
            className="product-edit-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleSave();
            }}
          >
            <label>
              Name
              <input value={draft.name} onChange={updateDraft("name")} />
            </label>
            <div className="product-edit-pair">
              <label>
                Unit
                <input value={draft.unit} onChange={updateDraft("unit")} />
              </label>
              <label>
                Default qty
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.default_quantity}
                  onChange={updateDraft("default_quantity")}
                />
              </label>
            </div>
            <div className="product-edit-pair">
              <label>
                Price
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.current_price}
                  onChange={updateDraft("current_price")}
                />
              </label>
              <label>
                Category
                <select
                  value={draft.category}
                  onChange={updateDraft("category")}
                >
                  <option value="">Uncategorised</option>
                  {categories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="product-edit-actions">
              <button type="submit" disabled={busy}>Save changes</button>
              <button
                type="button"
                className="secondary"
                onClick={cancelEditing}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </form>
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
            <div className="product-actions">
              <button
                className="icon-btn"
                onClick={startEditing}
                aria-label={`Edit ${product.name}`}
                title="Edit product"
                disabled={busy}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                className="icon-btn danger"
                onClick={handleDelete}
                aria-label={`Delete ${product.name}`}
                title="Delete product"
                disabled={busy}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
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
