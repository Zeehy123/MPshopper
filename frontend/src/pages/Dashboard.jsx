import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import ProductCard from "../components/ProductCard";

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getCategories()
      .then(setCategories)
      .catch((e) => setError(e.message));
  }, []);

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
  }, [search, category]);

  async function handlePriceChange(id, price) {
    const updated = await api.updateProduct(id, { current_price: price });
    setProducts((list) => list.map((p) => (p.id === id ? updated : p)));
  }

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <input
          type="search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="chips">
        <button
          className={category === "" ? "chip active" : "chip"}
          onClick={() => setCategory("")}
        >
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
      {loading && <p className="muted">Loading...</p>}

      {!loading && products.length === 0 && (
        <div className="card empty">
          <p>No products found.</p>
          <Link to="/add">Add your first product</Link>
        </div>
      )}

      <div className="grid">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            onPriceChange={handlePriceChange}
          />
        ))}
      </div>
    </>
  );
}
