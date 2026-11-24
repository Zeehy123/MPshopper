import { ArrowRight, Leaf } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import Botanicals from "./Botanicals";

export default function MarketingLayout({ children }) {
  return (
    <>
      <Botanicals />
      <div className="landing-page">
        <header className="landing-nav">
          <Link
            className="landing-brand"
            to="/"
            aria-label="My Grocery Shopper home"
          >
            <span className="landing-brand-mark">
              <Leaf size={19} aria-hidden="true" />
            </span>
            <span>My Grocery Shopper</span>
          </Link>
          <nav className="landing-nav-links" aria-label="Page">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/features">Features</NavLink>
            <NavLink to="/how-it-works">How it works</NavLink>
            <Link className="landing-signin" to="/login">
              Sign in
            </Link>
            <Link className="landing-nav-cta" to="/login?mode=register">
              Get started <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </nav>
        </header>
        {children}
        <footer className="landing-footer">
          <Link className="landing-brand" to="/">
            <span className="landing-brand-mark">
              <Leaf size={17} aria-hidden="true" />
            </span>
            <span>My Grocery Shopper</span>
          </Link>
          <p>Make room for the good stuff.</p>
        </footer>
      </div>
    </>
  );
}
