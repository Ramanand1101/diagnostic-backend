'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const CityContext = createContext({
  city: '', setCity: () => {},
  coords: null, setCoords: () => {},
  radiusKm: 10, setRadiusKm: () => {},
});

const STORAGE_KEY = 'dh_city';
const COORDS_KEY = 'dh_coords';
const RADIUS_KEY = 'dh_radius';

export function CityProvider({ children }) {
  const [city, setCityState] = useState('');
  // { lat, lng } from "use my location" — precise, radius-based filtering takes
  // priority over the plain city name whenever both are set.
  const [coords, setCoordsState] = useState(null);
  const [radiusKm, setRadiusKmState] = useState(10);

  // Load from localStorage on mount
  useEffect(() => {
    const savedCity = localStorage.getItem(STORAGE_KEY);
    if (savedCity) setCityState(savedCity);
    const savedCoords = localStorage.getItem(COORDS_KEY);
    if (savedCoords) {
      try { setCoordsState(JSON.parse(savedCoords)); } catch { /* ignore malformed value */ }
    }
    const savedRadius = localStorage.getItem(RADIUS_KEY);
    if (savedRadius) setRadiusKmState(Number(savedRadius));
  }, []);

  const setCoords = (value) => {
    setCoordsState(value);
    if (value) localStorage.setItem(COORDS_KEY, JSON.stringify(value));
    else localStorage.removeItem(COORDS_KEY);
  };

  const setCity = (value) => {
    setCityState(value);
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
    // Manually picking a city is a separate, broader mode from a precise "near me"
    // search — clear any previously-detected coordinates so city wins.
    setCoords(null);
  };

  const setRadiusKm = (value) => {
    setRadiusKmState(value);
    localStorage.setItem(RADIUS_KEY, String(value));
  };

  return (
    <CityContext.Provider value={{ city, setCity, coords, setCoords, radiusKm, setRadiusKm }}>
      {children}
    </CityContext.Provider>
  );
}

export const useCity = () => useContext(CityContext);
