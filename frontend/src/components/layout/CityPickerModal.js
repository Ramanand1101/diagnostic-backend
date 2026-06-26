'use client';
import { useState, useEffect, useCallback } from 'react';
import { FiX, FiNavigation, FiSearch } from 'react-icons/fi';
import { useCity } from '@/context/CityContext';
import { labApi } from '@/lib/api';
import CityLandmark from './CityLandmark';

export default function CityPickerModal({ open, onClose }) {
  const { city, setCity } = useCity();
  const [cities, setCities] = useState([]);
  const [filter, setFilter] = useState('');
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    labApi.getCities()
      .then((res) => setCities(res.data.cities || []))
      .catch(() => {});
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const selectCity = useCallback((c) => {
    setCity(c);
    onClose();
    setFilter('');
  }, [setCity, onClose]);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`
          );
          const data = await res.json();
          const detected =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.state_district ||
            '';
          if (detected) selectCity(detected);
        } catch {
          // silently fail
        } finally {
          setDetecting(false);
        }
      },
      () => setDetecting(false),
      { timeout: 8000 }
    );
  };

  if (!open) return null;

  const filtered = filter.trim()
    ? cities.filter((c) => c.toLowerCase().includes(filter.toLowerCase()))
    : cities;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal card */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-5 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900 text-center">Select your city</h2>

          {/* Detect location */}
          <button
            onClick={detectLocation}
            disabled={detecting}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-secondary-300 text-secondary-600 hover:bg-secondary-50 transition-colors font-medium text-sm disabled:opacity-60"
          >
            <FiNavigation className={detecting ? 'animate-pulse' : ''} />
            {detecting ? 'Detecting your location…' : 'Use my current location'}
          </button>

          {/* Search filter */}
          {cities.length > 8 && (
            <div className="relative mt-4">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search city…"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder-gray-400 text-gray-900"
                autoComplete="off"
              />
            </div>
          )}
        </div>

        {/* City grid */}
        <div className="overflow-y-auto px-6 pb-8 flex-1">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No cities found</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((c) => {
                const selected = city === c;
                return (
                  <button
                    key={c}
                    onClick={() => selectCity(c)}
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all hover:shadow-md group ${
                      selected
                        ? 'border-secondary-400 bg-secondary-50'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    {/* Landmark illustration */}
                    <div className="w-20 h-16">
                      <CityLandmark city={c} colored={selected} />
                    </div>

                    {/* City name */}
                    <span className={`text-sm font-semibold leading-tight ${
                      selected ? 'text-secondary-600' : 'text-gray-700 group-hover:text-gray-900'
                    }`}>
                      {c}
                    </span>

                    {/* Selected tick */}
                    {selected && (
                      <span className="absolute top-2 right-2 w-5 h-5 bg-secondary-500 rounded-full flex items-center justify-center">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Clear selection */}
          {city && (
            <div className="mt-5 text-center">
              <button
                onClick={() => { setCity(''); onClose(); }}
                className="text-sm text-gray-400 hover:text-accent-500 transition-colors underline underline-offset-2"
              >
                Clear location — show all cities
              </button>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <FiX className="text-gray-600 text-base" />
        </button>
      </div>
    </div>
  );
}
