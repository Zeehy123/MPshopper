import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { api } from "../api";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");

  const refreshCart = useCallback(async () => {
    try {
      setCart(await api.getCart());
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  async function addToCart(product) {
    await api.addItem({
      trip: cart.id,
      product: product.id,
      quantity: product.default_quantity,
    });
    await refreshCart();
  }

  async function updateItem(id, data) {
    await api.updateItem(id, data);
    await refreshCart();
  }

  async function removeItem(id) {
    await api.removeItem(id);
    await refreshCart();
  }

  const itemCount = cart ? cart.items.length : 0;
  const inCart = (productId) =>
    cart ? cart.items.some((i) => i.product === productId) : false;

  return (
    <CartContext.Provider
      value={{
        cart,
        error,
        itemCount,
        inCart,
        refreshCart,
        addToCart,
        updateItem,
        removeItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
