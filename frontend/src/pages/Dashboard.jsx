import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ScanLine, Search, Sprout } from "lucide-react";
import { api } from "../api";
import { useSync } from "../useSync";
import ProductCard from "../components/ProductCard";
import Scanner from "../components/Scanner";
import { useCart } from "../context/CartContext";
import { normalizeBarcode } from "../barcode";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { dataVersion } = useSync();
  const { inCart, addToCart } = useCart();
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // what the last scan did

  useEffect(() => {
    api
      .getCategories()
      .then(setCategories)
      .catch((e) => setError(e.message));
  }, [dataVersion]);

  // reload products when search or category changes (search waits 300ms)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      try {
        setLoading(true);
        setProducts(await api.getProducts(`?${params}`));
        setError("");
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, category, dataVersion]);

  async function handlePriceChange(id, price) {
    const updated = await api.updateProduct(id, { current_price: price });
    setProducts((list) => list.map((p) => (p.id === id ? updated : p)));
  }

  async function handleDelete(id) {
    await api.deleteProduct(id);
    setProducts((list) => list.filter((p) => p.id !== id));
  }

  // a scanned code: add the matching product to the cart, or offer to create it
  async function handleScan(code) {
    const clean = normalizeBarcode(code);
    try {
      const product = await api.findByBarcode(clean);
      if (!product) return setScanResult({ type: "missing", code: clean });
      if (inCart(product.id)) {
        return setScanResult({ type: "info", text: `${product.name} is already in your cart.` });
      }
      await addToCart(product);
      setScanResult({ type: "ok", text: `Added ${product.name} to your cart.` });
    } catch (e) {
      setScanResult({ type: "error", text: e.message });
    }
  }

  function closeScanner() {
    setScanning(false);
    setScanResult(null);
  }

  const filtering = search || category;

  return (
    <>
      <div className="page-header">
        <h1>Your products</h1>
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search products"
            aria-label="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button type="button" className="secondary scan-btn" onClick={() => setScanning(true)}>
          <ScanLine size={18} aria-hidden="true" /> Scan
        </button>
      </div>

      {scanning && (
        <Scanner onDetect={handleScan} onClose={closeScanner}>
          {scanResult?.type === "missing" ? (
            <div className="scan-result" role="status">
              <p>No product on your shelf has the barcode {scanResult.code}.</p>
              <Link to={`/add?barcode=${scanResult.code}`} className="btn-link">
                <Plus size={18} aria-hidden="true" /> Add it as a new product
              </Link>
            </div>
          ) : scanResult ? (
            <p className={scanResult.type === "error" ? "error" : "notice"} role="status">
              {scanResult.text}
            </p>
          ) : (
            <p className="muted">Point the camera at a product's barcode to add it to your cart.</p>
          )}
        </Scanner>
      )}

      <div className="chips" role="group" aria-label="Filter by category">
        <button className={category === "" ? "chip active" : "chip"} onClick={() => setCategory("")}>
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={String(c.id) === category ? "chip active" : "chip"}
            onClick={() => setCategory(String(c.id))}
          >
            {c.name}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && products.length === 0 && <p className="muted">Loading</p>}

      {!loading && products.length === 0 && (
        <div className="empty">
          <span className="empty-icon">
            <Sprout size={28} aria-hidden="true" />
          </span>
          <p>{filtering ? "Nothing matches that search." : "Your shelf is empty."}</p>
          {!filtering && (
            <Link to="/add" className="btn-link">
              <Plus size={18} aria-hidden="true" /> Add your first product
            </Link>
          )}
        </div>
      )}

      <div className="grid">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onPriceChange={handlePriceChange}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </>
  );
}
