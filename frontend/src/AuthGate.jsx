import { useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import App from "./App";
import Login from "./pages/Login";

export default function AuthGate() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return (
    <CartProvider>
      <App />
    </CartProvider>
  );
}
