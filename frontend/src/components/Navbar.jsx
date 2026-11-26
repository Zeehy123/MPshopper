import { NavLink } from "react-router-dom";
import { Store, CirclePlus, ShoppingBasket, History, ChartColumn, LogOut, Leaf, UserRound } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import SyncStatus from "./SyncStatus";

const TABS = [
  { to: "/", label: "Shop", Icon: Store, end: true },
  { to: "/add", label: "Add", Icon: CirclePlus },
  { to: "/cart", label: "Cart", Icon: ShoppingBasket, cart: true },
  { to: "/history", label: "History", Icon: History },
  { to: "/stats", label: "Stats", Icon: ChartColumn },
];

export default function Navbar() {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();

  const links = (className) =>
    TABS.map(({ to, label, Icon, end, cart }) => (
      <NavLink key={to} to={to} end={end} className={className}>
        <span className="nav-icon">
          <Icon size={20} aria-hidden="true" />
          {cart && itemCount > 0 && (
            <span className="cart-badge" aria-label={`${itemCount} in cart`}>
              {itemCount}
            </span>
          )}
        </span>
        <span>{label}</span>
      </NavLink>
    ));

  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="My Grocery Shopper home">
          <span className="brand-mark">
            <Leaf size={20} aria-hidden="true" />
          </span>
          <span className="brand-name">My Grocery Shopper</span>
        </NavLink>

        <nav className="nav-desktop" aria-label="Main">
          {links("nav-link")}
        </nav>

        <div className="topbar-right">
          <SyncStatus />
          <NavLink to="/profile" className="profile-link" aria-label="Your profile" title="Your profile">
            <UserRound size={18} aria-hidden="true" />
            <span className="who">{user?.username}</span>
          </NavLink>
          <button className="icon-btn on-dark" onClick={logout} aria-label="Log out" title="Log out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <nav className="tabbar" aria-label="Main">
        {links("tab")}
      </nav>
    </>
  );
}
