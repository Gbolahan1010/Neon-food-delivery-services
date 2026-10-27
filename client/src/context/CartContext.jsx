import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'neon-cart';
const EMPTY = { restaurant: null, items: [] };

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.items) ? saved : EMPTY;
  } catch {
    return EMPTY;
  }
}

/**
 * The basket lives in the browser (localStorage) until checkout, so browsing needs no login.
 * A basket holds dishes from one restaurant at a time, because one order = one restaurant.
 * Prices here are only for display: the API recalculates everything when the order is placed.
 */
export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Private browsing can block storage: the cart still works until the tab closes.
    }
  }, [cart]);

  /** Returns false (and changes nothing) if the dish is from a different restaurant. */
  const addItem = useCallback(
    (restaurant, dish) => {
      if (cart.restaurant && cart.restaurant.id !== restaurant._id) return false;
      setCart((current) => {
        const existing = current.items.find((i) => i.menuItemId === dish._id);
        const items = existing
          ? current.items.map((i) =>
              i.menuItemId === dish._id ? { ...i, quantity: Math.min(50, i.quantity + 1) } : i
            )
          : [
              ...current.items,
              { menuItemId: dish._id, name: dish.name, priceCents: dish.priceCents, quantity: 1 },
            ];
        return { restaurant: { id: restaurant._id, name: restaurant.name }, items };
      });
      return true;
    },
    [cart.restaurant]
  );

  /** Empties the basket and starts a new one from this restaurant with this dish. */
  const startNew = useCallback((restaurant, dish) => {
    setCart({
      restaurant: { id: restaurant._id, name: restaurant.name },
      items: [{ menuItemId: dish._id, name: dish.name, priceCents: dish.priceCents, quantity: 1 }],
    });
  }, []);

  const setQuantity = useCallback((menuItemId, quantity) => {
    setCart((current) => {
      const items = current.items
        .map((i) => (i.menuItemId === menuItemId ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0);
      return items.length ? { ...current, items } : EMPTY;
    });
  }, []);

  const clear = useCallback(() => setCart(EMPTY), []);

  const value = useMemo(() => {
    const count = cart.items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotalCents = cart.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
    return { ...cart, count, subtotalCents, addItem, startNew, setQuantity, clear };
  }, [cart, addItem, startNew, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
