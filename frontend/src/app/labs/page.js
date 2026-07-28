'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LabCard from '@/components/lab/LabCard';
import Pagination from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { labApi } from '@/lib/api';
import { useCity } from '@/context/CityContext';
import { getErrorMessage } from '@/utils/helpers';
import { FiFilter, FiX, FiGitMerge, FiCrosshair, FiSearch, FiMapPin } from 'react-icons/fi';
import toast from 'react-hot-toast';

const RADIUS_OPTIONS_KM = [5, 10, 25, 50];

function LabsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { city: selectedCity } = useCity();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  // A shared "/labs?city=X" link (from the homepage, or bookmarked/shared) always
  // wins over the app-wide selected city so the link behaves the way it reads.
  const [filters, setFilters] = useState({ city: searchParams.get('city') || selectedCity || '', homeCollection: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const limit = 12;

  // ── Nearest-labs state ──────────────────────────────────────────────────────
  const [mode, setMode] = useState('browse'); // 'browse' (city/filters) | 'nearby' (geo)
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [radiusKm, setRadiusKm] = useState(10);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [manualQuery, setManualQuery] = useState(''); // PIN code / city / address fallback
  const [geocoding, setGeocoding] = useState(false);

  const fetchLabs = async () => {
    setLoading(true);
    try {
      if (mode === 'nearby' && coords) {
        const res = await labApi.getNearby({ lat: coords.lat, lng: coords.lng, radiusKm, limit: 100 });
        const items = res.data.items || [];
        setLabs(items);
        setTotal(items.length);
      } else {
        const params = { page, limit, approved: true };
        if (filters.city) params.city = filters.city;
        if (filters.homeCollection) params.homeCollection = filters.homeCollection;
        const res = await labApi.getAll(params);
        setLabs(res.data.items || res.data.labs || []);
        setTotal(res.data.total || 0);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLabs(); }, [page, filters, mode, coords, radiusKm]);

  // Auto-prompt for location on load — browser shows its native permission dialog;
  // if the user denies or it's unavailable, we silently fall back to manual search.
  useEffect(() => { detectLocation(); }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocationDenied(true); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMode('nearby');
        setLocationDenied(false);
        setLocating(false);
      },
      () => { setLocationDenied(true); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Fallback for denied/unavailable geolocation — geocode a PIN code / city / address
  // via Nominatim, then run the same nearby-radius search around that point.
  const searchManualLocation = async (e) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(manualQuery)}`
      );
      const data = await res.json();
      if (!data.length) {
        toast.error('Could not find that location — try a different PIN code, city, or address');
        return;
      }
      setCoords({ lat: Number(data[0].lat), lng: Number(data[0].lon) });
      setMode('nearby');
    } catch {
      toast.error('Location lookup failed. Please try again.');
    } finally {
      setGeocoding(false);
    }
  };

  const backToBrowse = () => {
    setMode('browse');
    setCoords(null);
    setPage(1);
  };

  const handleFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) { toast.error('You can compare up to 3 labs'); return prev; }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (compareIds.length < 2) { toast.error('Select at least 2 labs to compare'); return; }
    router.push(`/labs/compare?ids=${compareIds.join(',')}`);
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diagnostic Labs</h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'nearby' ? `${total} labs within ${radiusKm} km of you` : `${total} labs available`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {compareIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{compareIds.length} selected</span>
                <button onClick={handleCompare} className="btn-primary text-sm flex items-center gap-2">
                  <FiGitMerge /> Compare
                </button>
                <button onClick={() => setCompareIds([])} className="text-sm text-gray-400 hover:text-gray-600">
                  <FiX />
                </button>
              </div>
            )}
            {mode === 'browse' && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 btn-secondary text-sm"
              >
                <FiFilter /> Filters
              </button>
            )}
          </div>
        </div>

        {/* Nearest-labs panel */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          {mode === 'nearby' ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary-700">
                <FiCrosshair /> Showing nearest labs first
              </span>
              <div className="flex items-center gap-1.5 ml-1">
                {RADIUS_OPTIONS_KM.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadiusKm(r)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      radiusKm === r ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
              <button onClick={backToBrowse} className="text-sm text-gray-400 hover:text-gray-600 underline ml-auto">
                Search by city / PIN code instead
              </button>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <button
                  onClick={detectLocation}
                  disabled={locating}
                  className="flex items-center gap-2 btn-primary text-sm disabled:opacity-60"
                >
                  <FiCrosshair /> {locating ? 'Detecting your location…' : 'Use my current location'}
                </button>
                <span className="text-xs text-gray-400">or search manually below</span>
              </div>
              {locationDenied && (
                <p className="text-xs text-amber-600 mb-3">
                  Location access denied or unavailable — search by PIN code, city, or address instead.
                </p>
              )}
              <form onSubmit={searchManualLocation} className="flex gap-2 max-w-md mt-2">
                <div className="relative flex-1">
                  <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    placeholder="Enter PIN code, city, or address"
                    className="input pl-9 text-sm w-full"
                  />
                </div>
                <button type="submit" disabled={geocoding} className="btn-secondary text-sm flex items-center gap-2 disabled:opacity-60">
                  <FiSearch /> {geocoding ? 'Searching…' : 'Search'}
                </button>
              </form>
            </div>
          )}
        </div>

        {showFilters && mode === 'browse' && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => handleFilter('city', e.target.value)}
                className="input"
                placeholder="e.g. Mumbai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Home Collection</label>
              <select
                value={filters.homeCollection}
                onChange={(e) => handleFilter('homeCollection', e.target.value)}
                className="input"
              >
                <option value="">All</option>
                <option value="true">Available</option>
                <option value="false">Not Available</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFilters({ city: '', homeCollection: '' }); setPage(1); }}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
              >
                <FiX /> Clear Filters
              </button>
            </div>
          </div>
        )}

        {compareIds.length > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 mb-6 text-sm text-primary-700 flex items-center justify-between">
            <span>{compareIds.length} lab{compareIds.length > 1 ? 's' : ''} selected for comparison (max 3)</span>
            <button onClick={handleCompare} className="font-medium underline">Compare Now</button>
          </div>
        )}

        {loading ? (
          <PageLoader />
        ) : labs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {mode === 'nearby'
              ? `No labs found within ${radiusKm} km. Try a larger radius.`
              : 'No labs found. Try different filters.'}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
              {labs.map((lab) => (
                <LabCard
                  key={lab._id}
                  lab={lab}
                  compareIds={compareIds}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
            {mode === 'browse' && (
              <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function LabsPage() {
  return (
    <Suspense>
      <LabsPageContent />
    </Suspense>
  );
}
