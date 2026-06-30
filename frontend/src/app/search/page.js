'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { PageLoader } from '@/components/ui/Spinner';
import { searchApi } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import {
  FiSearch, FiX, FiMapPin, FiClock,
  FiChevronDown, FiChevronUp, FiFilter, FiShoppingCart, FiCheck,
} from 'react-icons/fi';
import toast from 'react-hot-toast';

// ── Sidebar filter section ────────────────────────────────────────────────────
function FilterSection({ title, items, selected, onToggle, searchable }) {
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState('');
  const visible = q ? items.filter((i) => i.toLowerCase().includes(q.toLowerCase())) : items;

  return (
    <div className="border-b border-gray-100 last:border-0 pb-4">
      <button onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
        {title} {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {open && (
        <div className="space-y-2 mt-1">
          {searchable && (
            <div className="relative">
              <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Start typing"
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-300" />
            </div>
          )}
          <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
            {visible.map((item) => (
              <label key={item} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={selected.has(item)} onChange={() => onToggle(item)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 cursor-pointer flex-shrink-0" />
                <span className={`text-sm leading-tight truncate ${selected.has(item) ? 'text-primary-700 font-semibold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                  {item}
                </span>
              </label>
            ))}
            {visible.length === 0 && <p className="text-xs text-gray-400 py-1">No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Lab colour based on initial ───────────────────────────────────────────────
const PALETTE = [
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500',
  'bg-teal-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500',
];
function labColor(name = '') {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

// ── Product / test result row ─────────────────────────────────────────────────
const TYPE_COLOR = {
  test:     'bg-blue-50 text-blue-700 border-blue-100',
  package:  'bg-purple-50 text-purple-700 border-purple-100',
  medicine: 'bg-teal-50 text-teal-700 border-teal-100',
};

function ProductRow({ product }) {
  const { addItem, items } = useCart();
  const lab = product.lab || {};
  const initial = (lab.name || '?')[0].toUpperCase();
  const price = product.salePrice || product.price;
  const discount = product.salePrice && product.salePrice < product.price
    ? Math.round(((product.price - product.salePrice) / product.price) * 100)
    : null;
  const visibleTags = (product.tags || []).slice(0, 3);
  const inCart = items.some((i) => i._id === product._id);

  const handleAddToCart = () => {
    addItem(product);
    toast.success(`${product.name} added to cart!`, { icon: '🛒' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all hover:-translate-y-0.5">

      {/* Top row: left = badges + name + tags | right = description + price + button */}
      <div className="flex gap-5">

        {/* Left: test identity */}
        <div className="flex-1 min-w-0">
          {/* Type / fasting / sample badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {product.type && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border capitalize ${TYPE_COLOR[product.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                {product.type}
              </span>
            )}
            {product.fastingRequired && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700 border border-orange-100">
                Fasting Required
              </span>
            )}
            {product.sampleType && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-50 text-gray-600 border border-gray-200">
                {product.sampleType}
              </span>
            )}
          </div>

          {/* Test name */}
          <h3 className="font-bold text-gray-900 text-base leading-snug mb-2">{product.name}</h3>

          {/* Tags */}
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="w-px bg-gray-100 flex-shrink-0 self-stretch" />

        {/* Right: description + price + button */}
        <div className="flex flex-col gap-3 flex-shrink-0 w-64">

          {/* Description */}
          {product.description ? (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
              {product.description}
            </p>
          ) : (
            <p className="text-sm text-gray-300 italic">No description available</p>
          )}

          {/* Price + button */}
          <div className="flex items-center justify-between gap-2 mt-auto">
            <div>
              {discount && (
                <span className="inline-block text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full mb-0.5">
                  {discount}% OFF
                </span>
              )}
              <p className="text-xl font-extrabold text-gray-900">₹{price?.toLocaleString('en-IN')}</p>
              {discount && (
                <p className="text-xs text-gray-400 line-through">₹{product.price?.toLocaleString('en-IN')}</p>
              )}
            </div>

            {inCart ? (
              <Link href="/cart"
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
                <FiCheck className="text-base" /> View Cart
              </Link>
            ) : (
              <button onClick={handleAddToCart}
                className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap">
                <FiShoppingCart className="text-base" /> Add to Cart
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100 my-3" />

      {/* Lab info */}
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 ${labColor(lab.name)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
          {initial}
        </div>
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
          <span className="font-semibold text-gray-600 text-xs truncate">{lab.name || '—'}</span>
          <span className={`font-medium ${product.homeCollection ? 'text-green-600' : 'text-blue-600'}`}>
            {product.homeCollection ? '🏠 Home Collection' : '🏥 Lab Visit'}
          </span>
          {product.reportTime && <span>Report in {product.reportTime}</span>}
          {(lab.city || lab.state) && (
            <span className="flex items-center gap-0.5">
              <FiMapPin className="text-[10px]" />
              {[lab.city, lab.state].filter(Boolean).join(', ')}
            </span>
          )}
          {lab.accreditation?.slice(0, 1).map((acc) => (
            <span key={acc} className="text-purple-600 font-medium">{acc}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Lab result row ────────────────────────────────────────────────────────────
function LabRow({ lab }) {
  const initial = (lab.name || '?')[0].toUpperCase();
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className={`w-12 h-12 ${labColor(lab.name)} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm`}>
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{lab.name}</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {lab.homeCollection && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium">🏠 Home Collection</span>
          )}
          {lab.verificationStatus === 'verified' && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">✓ Verified</span>
          )}
          {lab.accreditation?.slice(0, 2).map((a) => (
            <span key={a} className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-medium">{a}</span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-gray-400">
          {lab.openingHours && <span className="flex items-center gap-1"><FiClock className="text-[10px]" /> {lab.openingHours}</span>}
          {(lab.city || lab.state) && (
            <span className="flex items-center gap-1"><FiMapPin className="text-[10px]" />{[lab.city, lab.state].filter(Boolean).join(', ')}</span>
          )}
          {lab.ratingAvg > 0 && <span>★ {lab.ratingAvg.toFixed(1)} ({lab.reviewCount} reviews)</span>}
        </div>
      </div>

      <Link href={`/labs/${lab.slug}`}
        className="flex-shrink-0 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
        View Lab
      </Link>
    </div>
  );
}

// ── Main search page ──────────────────────────────────────────────────────────
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [inputVal, setInputVal] = useState(() => searchParams.get('q') || '');
  const [city, setCity] = useState(() => searchParams.get('city') || '');
  const [results, setResults] = useState({ labs: [], products: [], pages: [] });
  const [loading, setLoading] = useState(false);
  const [selectedLabs, setSelectedLabs] = useState(new Set());
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const debounceRef = useRef(null);
  const isOwnNavRef = useRef(false);

  useEffect(() => {
    if (isOwnNavRef.current) { isOwnNavRef.current = false; return; }
    setInputVal(searchParams.get('q') || '');
    setCity(searchParams.get('city') || '');
  }, [searchParams]);

  const runSearch = useCallback(async (q, c) => {
    if (!q.trim()) { setResults({ labs: [], products: [], pages: [] }); return; }
    setLoading(true);
    setSelectedLabs(new Set());
    setSelectedLocations(new Set());
    try {
      const res = await searchApi.search({ q: q.trim(), city: c.trim() });
      setResults(res.data || { labs: [], products: [], pages: [] });
    } catch {
      setResults({ labs: [], products: [], pages: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!inputVal.trim()) { setResults({ labs: [], products: [], pages: [] }); return; }
    debounceRef.current = setTimeout(() => {
      runSearch(inputVal, city);
      isOwnNavRef.current = true;
      const params = new URLSearchParams();
      params.set('q', inputVal.trim());
      if (city.trim()) params.set('city', city.trim());
      router.replace(`/search?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [inputVal]);

  const applyCity = () => {
    runSearch(inputVal, city);
    isOwnNavRef.current = true;
    const params = new URLSearchParams();
    if (inputVal.trim()) params.set('q', inputVal.trim());
    if (city.trim()) params.set('city', city.trim());
    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  const products = results.products || [];
  const labs = results.labs || [];

  // Derive filter options from results
  const labNames = [...new Set(products.map((p) => p.lab?.name).filter(Boolean))];
  const locations = [...new Set([
    ...products.map((p) => p.lab?.city).filter(Boolean),
    ...labs.map((l) => l.city).filter(Boolean),
  ])];

  const toggle = (setter) => (val) => setter((prev) => {
    const n = new Set(prev);
    n.has(val) ? n.delete(val) : n.add(val);
    return n;
  });

  const filteredProducts = products.filter((p) =>
    (selectedLabs.size === 0 || selectedLabs.has(p.lab?.name)) &&
    (selectedLocations.size === 0 || selectedLocations.has(p.lab?.city))
  );
  const filteredLabs = labs.filter((l) =>
    selectedLocations.size === 0 || selectedLocations.has(l.city)
  );

  const totalFiltered = filteredProducts.length + filteredLabs.length;
  const hasFilters = selectedLabs.size > 0 || selectedLocations.size > 0;
  const hasResults = products.length > 0 || labs.length > 0;
  const clearFilters = () => { setSelectedLabs(new Set()); setSelectedLocations(new Set()); };

  const sidebar = (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800 text-sm">Filters</h2>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">
            Clear all
          </button>
        )}
      </div>
      {labNames.length > 0 && (
        <FilterSection title="Medical Center" items={labNames}
          selected={selectedLabs} onToggle={toggle(setSelectedLabs)} searchable={labNames.length > 4} />
      )}
      {locations.length > 0 && (
        <FilterSection title="Location" items={locations}
          selected={selectedLocations} onToggle={toggle(setSelectedLocations)} searchable={locations.length > 4} />
      )}
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">

        {/* Top search bar */}
        <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-16 z-30">
          <div className="max-w-6xl mx-auto flex gap-3 flex-wrap sm:flex-nowrap">
            {/* City — LEFT */}
            <div className="flex gap-2 flex-shrink-0">
              <div className="relative">
                <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyCity()}
                  placeholder="City" className="input pl-8 w-36" />
              </div>
              {city && (
                <button onClick={() => { setCity(''); runSearch(inputVal, ''); }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 transition-colors">
                  <FiX />
                </button>
              )}
            </div>
            {/* Search input — RIGHT */}
            <div className="flex-1 relative min-w-0">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search tests, packages, labs..."
                className="input pl-9 pr-9 w-full" autoFocus autoComplete="off" />
              {inputVal && (
                <button onClick={() => { setInputVal(''); setResults({ labs: [], products: [], pages: [] }); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <FiX className="text-sm" />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {hasResults && (
                <button onClick={() => setMobileSidebar((v) => !v)}
                  className="md:hidden px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 flex items-center gap-1.5">
                  <FiFilter /> Filters
                  {hasFilters && <span className="w-4 h-4 bg-primary-600 text-white text-[10px] rounded-full flex items-center justify-center">{selectedLabs.size + selectedLocations.size}</span>}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {!inputVal.trim() ? (
            <div className="text-center py-24 text-gray-400">
              <FiSearch className="text-5xl mx-auto mb-4 opacity-20" />
              <p className="text-base font-medium">Search for tests, packages or labs</p>
              <p className="text-sm mt-1">e.g. "CBC Test", "Full Body Checkup", "Apollo Labs"</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
              <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Searching{city.trim() ? ` in ${city}` : ''}…</span>
            </div>
          ) : !hasResults ? (
            <div className="text-center py-24 text-gray-500">
              <p className="text-lg font-semibold">No results for &ldquo;{inputVal}&rdquo;{city.trim() ? ` in ${city}` : ''}</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term or city</p>
              {city.trim() && (
                <button onClick={() => { setCity(''); runSearch(inputVal, ''); }}
                  className="mt-3 text-sm text-primary-600 hover:underline">
                  Search all cities
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-6 items-stretch">

              {/* ── Left sidebar — desktop (sticky) ── */}
              <aside className="w-60 flex-shrink-0 hidden md:block sticky top-36 self-start">
                <div className="bg-white rounded-xl border border-gray-100 p-4 max-h-[calc(100vh-10rem)] overflow-y-auto">
                  {sidebar}
                </div>
              </aside>

              {/* ── Mobile sidebar overlay ── */}
              {mobileSidebar && (
                <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileSidebar(false)}>
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="absolute left-0 top-0 bottom-0 w-72 bg-white p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bold text-gray-900">Filters</h2>
                      <button onClick={() => setMobileSidebar(false)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
                    </div>
                    {sidebar}
                  </div>
                </div>
              )}

              {/* ── Results ── */}
              <div className="flex-1 min-w-0 space-y-5">
                {/* Summary row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-gray-500">
                    <span className="font-bold text-gray-900">{totalFiltered}</span> result{totalFiltered !== 1 ? 's' : ''} for &ldquo;{inputVal}&rdquo;
                    {city.trim() && (
                      <span className="inline-flex items-center gap-1 ml-2 bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        <FiMapPin className="text-[10px]" />{city}
                        <button onClick={() => { setCity(''); runSearch(inputVal, ''); }} className="ml-0.5 hover:text-primary-900"><FiX className="text-[10px]" /></button>
                      </span>
                    )}
                    {hasFilters && <span className="text-primary-600 ml-1 text-xs">(filtered)</span>}
                  </p>
                </div>

                {/* Tests & Packages */}
                {filteredProducts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tests &amp; Packages</h3>
                    {filteredProducts.map((p) => <ProductRow key={p._id || p.objectID} product={p} />)}
                  </div>
                )}

                {/* Labs */}
                {filteredLabs.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Labs</h3>
                    {filteredLabs.map((lab) => <LabRow key={lab._id || lab.objectID} lab={lab} />)}
                  </div>
                )}

                {totalFiltered === 0 && hasFilters && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">No results match the selected filters.</p>
                    <button onClick={clearFilters} className="mt-2 text-sm text-primary-600 hover:underline">Clear filters</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <SearchContent />
    </Suspense>
  );
}
