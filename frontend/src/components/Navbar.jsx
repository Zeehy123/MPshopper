import { NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { itemCount } = useCart();
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
      </nav>
    </header>
  );
}
