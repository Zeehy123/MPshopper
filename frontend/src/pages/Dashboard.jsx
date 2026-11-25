import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Sprout } from "lucide-react";
import { api } from "../api";
import { useSync } from "../useSync";
import ProductCard from "../components/ProductCard";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { dataVersion } = useSync();

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

  async function handleProductUpdate(id, data) {
    const updated = await api.updateProduct(id, data);
    setProducts((list) => list.map((p) => (p.id === id ? updated : p)));
  }

  async function handleProductDelete(id) {
    await api.deleteProduct(id);
    setProducts((list) => list.filter((product) => product.id !== id));
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
      </div>

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
            categories={categories}
            onUpdate={handleProductUpdate}
            onDelete={handleProductDelete}
          />
        ))}
      </div>
    </>
  );
}
