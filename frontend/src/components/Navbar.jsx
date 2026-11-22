import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { sync } from "../sync";

export default function Navbar() {
  const { itemCount } = useCart();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      await sync();
      window.location.reload(); // simple for now; Step 4 refreshes the page live
    } catch (e) {
      alert(`Sync failed: ${e.message}`);
      setSyncing(false);
    }
  }

  return (
    <header className="navbar">
      <span className="brand">🛒 My Grocery Shopper</span>
      <nav>
        <NavLink to="/" end>
          Dashboard
        </NavLink>
        <NavLink to="/add">Add Product</NavLink>
        <NavLink to="/history">History</NavLink>
        <NavLink to="/stats">Stats</NavLink>
        <NavLink to="/cart" className="cart-link">
          Cart <span className="badge">{itemCount}</span>
        </NavLink>
        <button className="secondary" onClick={handleSync} disabled={syncing}>
          {syncing ? "Syncing..." : "⟳ Sync"}
        </button>
      </nav>
    </header>
  );
}
