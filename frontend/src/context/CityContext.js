'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const CityContext = createContext({ city: '', setCity: () => {} });

const STORAGE_KEY = 'dh_city';

export function CityProvider({ children }) {
  const [city, setCityState] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCityState(saved);
  }, []);

  const setCity = (value) => {
    setCityState(value);
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <CityContext.Provider value={{ city, setCity }}>
      {children}
    </CityContext.Provider>
  );
}

export const useCity = () => useContext(CityContext);
