import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const UNITS = [
  "kg",
  "g",
  "bag",
  "tin",
  "bottle",
  "litre",
  "pack",
  "piece",
  "crate",
  "dozen",
];

export default function AddProduct() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "",
    default_quantity: "1",
    current_price: "",
    store: "",
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getCategories()
      .then(setCategories)
      .catch(() => {});
    api
      .getStores()
      .then(setStores)
      .catch(() => {});
  }, []);

  // free the preview URL when it changes or the page closes
  useEffect(() => {
    return () => preview && URL.revokeObjectURL(preview);
  }, [preview]);

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((x) => ({ ...x, image: "Please choose an image file." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((x) => ({ ...x, image: "Image must be under 5 MB." }));
      return;
    }
    setErrors((x) => ({ ...x, image: "" }));
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleAddCategory() {
    const name = newCategory.trim();
    if (!name) return;
    try {
      const created = await api.createCategory({ name });
      setCategories((list) => [...list, created]);
      setForm((f) => ({ ...f, category: String(created.id) }));
      setNewCategory("");
    } catch (e) {
      setErrors((x) => ({
        ...x,
        category: "Could not add category (it may already exist).",
      }));
    }
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.unit.trim()) e.unit = "Unit is required.";
    if (!form.current_price || Number(form.current_price) <= 0)
      e.current_price = "Enter a price above zero.";
    if (!form.default_quantity || Number(form.default_quantity) <= 0)
      e.default_quantity = "Quantity must be above zero.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const data = new FormData();
    data.append("name", form.name.trim());
    data.append("unit", form.unit.trim());
    data.append("default_quantity", form.default_quantity);
    data.append("current_price", form.current_price);
    if (form.category) data.append("category", form.category);
    if (form.store) data.append("store", form.store);
    if (image) data.append("image", image);

    try {
      setSubmitting(true);
      await api.createProduct(data);
      navigate("/");
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1>Add Product</h1>
      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. Rice (Ofada)"
          />
          {errors.name && <span className="error">{errors.name}</span>}
        </label>

        <label>
          Picture
          <input type="file" accept="image/*" onChange={handleImage} />
          {errors.image && <span className="error">{errors.image}</span>}
        </label>
        {preview && <img src={preview} alt="Preview" className="preview" />}

        <label>
          Category
          <select value={form.category} onChange={set("category")}>
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-add">
          <input
            placeholder="Or create a new category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button
            type="button"
            className="secondary"
            onClick={handleAddCategory}
          >
            Add
          </button>
        </div>
        {errors.category && <span className="error">{errors.category}</span>}

        <div className="row">
          <label>
            Unit
            <input
              list="units"
              value={form.unit}
              onChange={set("unit")}
              placeholder="kg, bag, tin..."
            />
            <datalist id="units">
              {UNITS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            {errors.unit && <span className="error">{errors.unit}</span>}
          </label>

          <label>
            Default quantity
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.default_quantity}
              onChange={set("default_quantity")}
            />
            {errors.default_quantity && (
              <span className="error">{errors.default_quantity}</span>
            )}
          </label>
        </div>

        <div className="row">
          <label>
            Price (₦ per unit)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.current_price}
              onChange={set("current_price")}
            />
            {errors.current_price && (
              <span className="error">{errors.current_price}</span>
            )}
          </label>

          <label>
            Store (optional)
            <select value={form.store} onChange={set("store")}>
              <option value="">Not specified</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {errors.form && <p className="error">{errors.form}</p>}

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save product"}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
