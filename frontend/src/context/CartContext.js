'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

// Every item carries a stable cartItemId separate from the product's own _id — that's
// what makes it possible to add the SAME test to the cart more than once (e.g. booking
// one test for two different family members), since two cart lines can share a product
// _id but never a cartItemId. Older carts persisted before this existed fall back to
// using the product _id as their cartItemId, so nothing breaks for returning visitors.
function withCartItemId(product) {
  return product.cartItemId ? product : { ...product, cartItemId: crypto.randomUUID() };
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dh_cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        setItems(parsed.map((i) => ({ ...i, cartItemId: i.cartItemId || i._id })));
      }
    } catch {}
  }, []);

  const persist = (next) => {
    localStorage.setItem('dh_cart', JSON.stringify(next));
    return next;
  };

  // Adds a product if no copy of it is in the cart yet — the ordinary "Add to Cart"
  // behavior used everywhere in the app (product cards, search results, etc).
  const addItem = useCallback((product) => {
    setItems((prev) => {
      if (prev.find((i) => i._id === product._id)) return prev;
      return persist([...prev, withCartItemId(product)]);
    });
  }, []);

  // Always adds a new cart line for this product, even if one's already in the cart —
  // used specifically for "book this same test for another family member too."
  const addDuplicate = useCallback((product) => {
    setItems((prev) => persist([...prev, withCartItemId({ ...product, cartItemId: undefined })]));
  }, []);

  const removeItem = useCallback((cartItemId) => {
    setItems((prev) => persist(prev.filter((i) => i.cartItemId !== cartItemId)));
  }, []);

  const clearCart = useCallback(() => {
    localStorage.removeItem('dh_cart');
    setItems([]);
  }, []);

  return (
    <CartContext.Provider value={{ items, addItem, addDuplicate, removeItem, clearCart, count: items.length }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
