'use client';
import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { FiCrosshair } from 'react-icons/fi';

// Leaflet's default marker icon references image files that bundlers can't resolve
// automatically — a plain divIcon sidesteps that entirely (no image assets needed).
const pinIcon = L.divIcon({
  html: '<div style="font-size:28px;line-height:1;transform:translate(-2px,-6px)">📍</div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const DEFAULT_CENTER = [22.9734, 78.6569]; // geographic center of India — used when no coords yet

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

// Controlled lat/lng picker: click-to-place or drag the marker on the map, plus manual
// number inputs and a "use my current location" button, all kept in sync.
export default function LabLocationPicker({ lat, lng, onChange }) {
  const [locating, setLocating] = useState(false);
  const hasCoords = typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng);
  const center = hasCoords ? [lat, lng] : DEFAULT_CENTER;

  const setCoords = useCallback((newLat, newLng) => {
    onChange({ lat: Number(newLat.toFixed(6)), lng: Number(newLng.toFixed(6)) });
  }, [onChange]);

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation is not supported by this browser');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords(pos.coords.latitude, pos.coords.longitude); setLocating(false); },
      () => { toast.error('Could not detect location — permission denied or unavailable'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-gray-700">Location (Latitude / Longitude)</label>
        <button type="button" onClick={detectLocation} disabled={locating}
          className="flex items-center gap-1 text-xs text-primary-600 hover:underline disabled:opacity-50">
          <FiCrosshair size={11} /> {locating ? 'Detecting…' : 'Use my current location'}
        </button>
      </div>

      <div className="rounded-xl overflow-hidden border border-gray-200 mb-2" style={{ height: 260 }}>
        <MapContainer center={center} zoom={hasCoords ? 15 : 5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={setCoords} />
          {hasCoords && (
            <Marker
              position={center}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat: newLat, lng: newLng } = e.target.getLatLng();
                  setCoords(newLat, newLng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-[11px] text-gray-400 mb-2">Click anywhere on the map to drop a pin, or drag the pin to fine-tune.</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Latitude</label>
          <input
            type="number" step="any" value={lat ?? ''}
            onChange={(e) => onChange({ lat: e.target.value === '' ? null : Number(e.target.value), lng: lng ?? null })}
            className="input text-sm" placeholder="e.g. 26.8467"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Longitude</label>
          <input
            type="number" step="any" value={lng ?? ''}
            onChange={(e) => onChange({ lat: lat ?? null, lng: e.target.value === '' ? null : Number(e.target.value) })}
            className="input text-sm" placeholder="e.g. 80.9462"
          />
        </div>
      </div>
    </div>
  );
}
