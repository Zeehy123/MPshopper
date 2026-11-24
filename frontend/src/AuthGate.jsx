import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import App from "./App";
import Features from "./pages/Features";
import HowItWorks from "./pages/HowItWorks";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

export default function AuthGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (pathname === "/features") return <Features />;
  if (pathname === "/how-it-works") return <HowItWorks />;
  if (!user) return pathname === "/" ? <Landing /> : <Login />;
  if (pathname === "/login") return <Navigate to="/" replace />;

  return (
    <CartProvider>
      <App />
    </CartProvider>
  );
}
