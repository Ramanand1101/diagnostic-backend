'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dh_cart');
      if (stored) setItems(JSON.parse(stored));
    } catch {}
  }, []);

  const persist = (next) => {
    localStorage.setItem('dh_cart', JSON.stringify(next));
    return next;
  };

  const addItem = useCallback((product) => {
    setItems((prev) => {
      if (prev.find((i) => i._id === product._id)) return prev;
      return persist([...prev, product]);
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => persist(prev.filter((i) => i._id !== id)));
  }, []);

  const clearCart = useCallback(() => {
    localStorage.removeItem('dh_cart');
    setItems([]);
  }, []);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, count: items.length }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
