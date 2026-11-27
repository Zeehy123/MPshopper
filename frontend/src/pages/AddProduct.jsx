import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { api } from "../api";
import Scanner from "../components/Scanner";
import { compressImage } from "../image";
import { isValidGtin, lookupBarcode, normalizeBarcode } from "../barcode";

// "Milo" + brand "Nestle" -> "Nestle Milo", unless the name already has the brand
const nameFrom = ({ name, brand }) =>
  brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${name}` : name;

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
  const { id } = useParams(); // present on /edit/:id
  const editing = Boolean(id);
  const [params] = useSearchParams(); // /add?barcode=... comes from the scanner

  const [form, setForm] = useState({
    barcode: normalizeBarcode(params.get("barcode")),
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
  const [existingImage, setExistingImage] = useState("");
  const [loadingProduct, setLoadingProduct] = useState(editing);
  const [loadError, setLoadError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [lookupNote, setLookupNote] = useState("");

  // name suggestion from the open product database (needs internet; skipped if offline)
  const suggestName = useCallback((code) => {
    lookupBarcode(code).then((found) => {
      if (!found) return;
      setForm((f) => (f.name ? f : { ...f, name: nameFrom(found) }));
      setLookupNote("Name suggested from the barcode. Check it before saving.");
    });
  }, []);

  // arrived from a scan of an unknown product: suggest its name
  useEffect(() => {
    const code = normalizeBarcode(params.get("barcode"));
    if (!id && code) suggestName(code);
  }, [id, params, suggestName]);

  // editing: fill the form with the product as it is now
  useEffect(() => {
    if (!id) return;
    api
      .getProduct(id)
      .then((p) => {
        setForm({
          barcode: p.barcode ?? "",
          name: p.name,
          category: p.category ?? "",
          unit: p.unit,
          default_quantity: String(p.default_quantity),
          current_price: String(p.current_price),
          store: "",
        });
        setExistingImage(p.image ?? "");
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoadingProduct(false));
  }, [id]);

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

  async function handleImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((x) => ({ ...x, image: "Please choose an image file." }));
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      setErrors((x) => ({ ...x, image: "Please choose a picture under 40 MB." }));
      return;
    }
    setErrors((x) => ({ ...x, image: "" }));
    setCompressing(true);
    try {
      // shrink it on this device first: faster to upload, and it fits the 5 MB limit
      const small = await compressImage(file);
      if (small.size > 5 * 1024 * 1024) {
        setErrors((x) => ({ ...x, image: "That picture is still over 5 MB. Try another." }));
        return;
      }
      setImage(small);
      setPreview(URL.createObjectURL(small));
    } finally {
      setCompressing(false);
    }
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
    if (form.barcode.trim() && !isValidGtin(normalizeBarcode(form.barcode)))
      e.barcode = "That does not look like a valid barcode. Check the digits.";
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    if (editing) {
      try {
        setSubmitting(true);
        await api.updateProduct(id, {
          name: form.name,
          unit: form.unit,
          default_quantity: form.default_quantity,
          current_price: form.current_price,
          barcode: form.barcode,
          category: form.category || null,
          store: form.store || null,
          ...(image ? { image } : {}),
        });
        navigate("/");
      } catch (err) {
        setErrors({ form: err.message });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const data = new FormData();
    data.append("name", form.name.trim());
    data.append("unit", form.unit.trim());
    data.append("default_quantity", form.default_quantity);
    data.append("current_price", form.current_price);
    data.append("barcode", normalizeBarcode(form.barcode));
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

  if (loadingProduct) return <p className="muted">Loading...</p>;
  if (loadError)
    return (
      <>
        <p className="error">Could not open this product: {loadError}</p>
        <Link to="/" className="btn-link">
          Back to your products
        </Link>
      </>
    );

  return (
    <>
      <h1>{editing ? "Edit product" : "Add Product"}</h1>
      <form className="card form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            value={form.name}
            onChange={set("name")}
            placeholder="e.g. Rice (Ofada)"
          />
          {errors.name && <span className="error">{errors.name}</span>}
          {lookupNote && <span className="muted">{lookupNote}</span>}
        </label>

        <label>
          Barcode (optional)
          <div className="barcode-row">
            <input
              inputMode="numeric"
              value={form.barcode}
              onChange={set("barcode")}
              placeholder="Scan it or type the number"
            />
            <button type="button" className="secondary" onClick={() => setScanning(true)}>
              <ScanLine size={18} aria-hidden="true" /> Scan
            </button>
          </div>
          {errors.barcode && <span className="error">{errors.barcode}</span>}
        </label>

        <label>
          {editing ? "Replace picture (optional)" : "Picture"}
          <input type="file" accept="image/*" onChange={handleImage} />
          {errors.image && <span className="error">{errors.image}</span>}
          {compressing && <span className="muted">Shrinking the picture...</span>}
        </label>
        {(preview || existingImage) && (
          <img src={preview || existingImage} alt="Preview" className="preview" />
        )}

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
            {editing && (
              <span className="muted">Only recorded if you change the price.</span>
            )}
          </label>
        </div>

        {errors.form && <p className="error">{errors.form}</p>}

        <div className="form-actions">
          <button type="submit" disabled={submitting || compressing}>
            {submitting ? "Saving..." : editing ? "Save changes" : "Save product"}
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

      {scanning && (
        <Scanner
          onClose={() => setScanning(false)}
          onDetect={(code) => {
            const clean = normalizeBarcode(code);
            setForm((f) => ({ ...f, barcode: clean }));
            setLookupNote("");
            setScanning(false);
            if (!editing && !form.name.trim()) suggestName(clean);
          }}
        />
      )}
    </>
  );
}
