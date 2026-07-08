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
  FiDroplet, FiHome, FiAlertCircle, FiInfo,
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

// ── Lab colour ────────────────────────────────────────────────────────────────
const PALETTE = ['bg-blue-500','bg-indigo-500','bg-purple-500','bg-teal-500','bg-rose-500','bg-amber-500','bg-emerald-500'];
function labColor(name = '') { return PALETTE[name.charCodeAt(0) % PALETTE.length]; }

const TYPE_COLOR = {
  test:     'bg-blue-50 text-blue-700 border-blue-100',
  package:  'bg-purple-50 text-purple-700 border-purple-100',
  medicine: 'bg-teal-50 text-teal-700 border-teal-100',
};

// ── Description panel (right sticky) ─────────────────────────────────────────
function DescriptionPanel({ product }) {
  if (!product) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center min-h-[220px]">
        <FiInfo className="text-3xl text-gray-200 mb-3" />
        <p className="text-sm text-gray-400 font-medium">Hover over a test</p>
        <p className="text-xs text-gray-300 mt-1">to see its description here</p>
      </div>
    );
  }

  const lab = product.lab || {};

  return (
    <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-5 transition-all">
      {/* Type badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {product.type && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border capitalize ${TYPE_COLOR[product.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {product.type}
          </span>
        )}
        {product.fastingRequired && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-1">
            <FiAlertCircle className="text-[10px]" /> Fasting Required
          </span>
        )}
        {product.sampleType && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-50 text-gray-500 border border-gray-200 flex items-center gap-1">
            <FiDroplet className="text-[10px]" /> {product.sampleType}
          </span>
        )}
      </div>

      {/* Test name */}
      <h3 className="font-bold text-gray-900 text-base leading-snug mb-3">{product.name}</h3>

      {/* Description */}
      {product.description ? (
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{product.description}</p>
      ) : (
        <p className="text-sm text-gray-300 italic mb-4">No description available for this test.</p>
      )}

      {/* Key info */}
      <div className="space-y-1.5 mb-4">
        {product.reportTime && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FiClock className="text-gray-400 flex-shrink-0" />
            <span>Report ready in <strong>{product.reportTime}</strong></span>
          </div>
        )}
        {product.homeCollection && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <FiHome className="flex-shrink-0" />
            <span>Home collection available</span>
          </div>
        )}
        {lab.name && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className={`w-4 h-4 ${labColor(lab.name)} rounded-full flex-shrink-0`} />
            <span>{lab.name}{lab.city ? `, ${lab.city}` : ''}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {product.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-100">
          {product.tags.map((tag) => (
            <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lab group card (BookMeriLab style) ───────────────────────────────────────
function LabGroupCard({ labId, lab, products }) {
  const { addItem, items } = useCart();
  const initial = (lab.name || '?')[0].toUpperCase();

  const totalMrp  = products.reduce((s, p) => s + (p.price || 0), 0);
  const totalSale = products.reduce((s, p) => s + (p.salePrice || p.price || 0), 0);
  const savings   = totalMrp - totalSale;
  const discountPct = totalMrp > 0 ? Math.round((savings / totalMrp) * 100) : 0;
  const hasHome   = products.some((p) => p.homeCollection);
  const reportTime = products[0]?.reportTime || lab.reportTime;

  const allInCart = products.every((p) => items.some((i) => i._id === p._id));

  const handleAddAll = (e) => {
    e.stopPropagation();
    products.forEach((p) => {
      if (!items.some((i) => i._id === p._id)) addItem(p);
    });
    toast.success(`${products.length} test${products.length > 1 ? 's' : ''} added to cart!`, { icon: '🛒' });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">

      {/* Lab header */}
      <div className="flex items-start justify-between p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${labColor(lab.name)} rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow`}>
            {initial}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base leading-tight">{lab.name || 'Unknown Lab'}</h3>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {lab.accreditation?.slice(0, 2).map((a) => (
                <span key={a} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">{a}</span>
              ))}
              {hasHome && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-semibold flex items-center gap-1">
                  <FiHome className="text-[10px]" /> Home Collection
                </span>
              )}
              {lab.verificationStatus === 'verified' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-semibold">✓ Verified</span>
              )}
            </div>
          </div>
        </div>

        {discountPct > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">
            {discountPct}% OFF
          </span>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-4 px-5 pb-3 text-[11px] text-gray-400">
        {reportTime && (
          <span className="flex items-center gap-1"><FiClock className="text-[10px]" /> Report in {reportTime}</span>
        )}
        {(lab.city || lab.state) && (
          <span className="flex items-center gap-1"><FiMapPin className="text-[10px]" />{[lab.city, lab.state].filter(Boolean).join(', ')}</span>
        )}
        {lab.ratingAvg > 0 && (
          <span>★ {lab.ratingAvg.toFixed(1)} ({lab.reviewCount || 0} reviews)</span>
        )}
      </div>

      {/* Tests list */}
      <div className="px-5 pb-4 space-y-2">
        {products.map((p) => {
          const saleP = p.salePrice || p.price;
          const hasDis = p.salePrice && p.salePrice < p.price;
          return (
            <div key={p._id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1 mb-0.5">
                  {p.type && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border capitalize ${TYPE_COLOR[p.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {p.type}
                    </span>
                  )}
                  {p.fastingRequired && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100 font-medium">Fasting</span>
                  )}
                  {p.sampleType && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200 font-medium flex items-center gap-0.5">
                      <FiDroplet className="text-[9px]" />{p.sampleType}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                {p.description && <p className="text-[11px] text-gray-400 truncate mt-0.5">{p.description}</p>}
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                {hasDis && (
                  <p className="text-[11px] text-gray-400 line-through">₹{p.price?.toLocaleString('en-IN')}</p>
                )}
                <p className="text-base font-extrabold text-gray-900">₹{saleP?.toLocaleString('en-IN')}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total + CTA */}
      <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Total payable</p>
          <p className="text-xl font-extrabold text-gray-900">₹{totalSale.toLocaleString('en-IN')}</p>
          {savings > 0 && (
            <p className="text-xs text-green-600 font-medium">You save ₹{savings.toLocaleString('en-IN')}</p>
          )}
        </div>
        {allInCart ? (
          <Link href="/cart"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors">
            <FiCheck /> View Cart
          </Link>
        ) : (
          <button onClick={handleAddAll}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors">
            <FiShoppingCart /> Book Now
          </button>
        )}
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

  // multi-test: read all `test` params from URL
  const testParams = searchParams.getAll('test');
  const [multiTests, setMultiTests] = useState(() => testParams);
  const [inputVal, setInputVal] = useState(() => searchParams.get('q') || '');
  const [city, setCity] = useState(() => searchParams.get('city') || '');
  const [results, setResults] = useState({ labs: [], products: [], pages: [] });
  const [loading, setLoading] = useState(false);
  const [selectedLabs, setSelectedLabs] = useState(new Set());
  const [selectedLocations, setSelectedLocations] = useState(new Set());
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const debounceRef = useRef(null);
  const isOwnNavRef = useRef(false);

  useEffect(() => {
    if (isOwnNavRef.current) { isOwnNavRef.current = false; return; }
    const tp = searchParams.getAll('test');
    setMultiTests(tp);
    setInputVal(searchParams.get('q') || '');
    setCity(searchParams.get('city') || '');
  }, [searchParams]);

  // Search each test separately and merge unique products
  const runSearch = useCallback(async (q, c, tests = []) => {
    const queries = tests.length > 0 ? tests : (q.trim() ? [q.trim()] : []);
    if (queries.length === 0) { setResults({ labs: [], products: [], pages: [] }); setActiveProduct(null); return; }
    setLoading(true);
    setSelectedLabs(new Set());
    setSelectedLocations(new Set());
    setActiveProduct(null);
    try {
      // Run all queries in parallel, merge unique products by _id
      const responses = await Promise.all(
        queries.map((term) => searchApi.search({ q: term.trim(), city: c.trim() }).catch(() => ({ data: {} })))
      );
      const seen = new Set();
      const mergedProducts = [];
      const mergedLabs = [];
      responses.forEach((res) => {
        const data = res.data || {};
        (data.products || []).forEach((p) => {
          if (!seen.has(p._id)) { seen.add(p._id); mergedProducts.push(p); }
        });
        (data.labs || []).forEach((l) => {
          if (!mergedLabs.find((x) => x._id === l._id)) mergedLabs.push(l);
        });
      });
      const merged = { products: mergedProducts, labs: mergedLabs, pages: [] };
      setResults(merged);
      if (mergedProducts.length > 0) setActiveProduct(mergedProducts[0]);
    } catch {
      setResults({ labs: [], products: [], pages: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  // effective query label for display
  const effectiveQuery = multiTests.length > 0 ? multiTests.join(', ') : inputVal;

  // Run search on multiTests or inputVal change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const hasQuery = multiTests.length > 0 || inputVal.trim();
    if (!hasQuery) { setResults({ labs: [], products: [], pages: [] }); setActiveProduct(null); return; }
    debounceRef.current = setTimeout(() => {
      runSearch(inputVal, city, multiTests);
      isOwnNavRef.current = true;
      const params = new URLSearchParams();
      if (multiTests.length > 0) multiTests.forEach((t) => params.append('test', t));
      else if (inputVal.trim()) params.set('q', inputVal.trim());
      if (city.trim()) params.set('city', city.trim());
      router.replace(`/search?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [inputVal, multiTests]);

  const applyCity = () => {
    runSearch(inputVal, city, multiTests);
    isOwnNavRef.current = true;
    const params = new URLSearchParams();
    if (multiTests.length > 0) multiTests.forEach((t) => params.append('test', t));
    else if (inputVal.trim()) params.set('q', inputVal.trim());
    if (city.trim()) params.set('city', city.trim());
    router.replace(`/search?${params.toString()}`, { scroll: false });
  };

  const products = results.products || [];
  const labs = results.labs || [];

  // Group products by lab
  const labGroupMap = products.reduce((acc, p) => {
    const labId = p.lab?._id || p.lab || 'unknown';
    if (!acc[labId]) acc[labId] = { lab: p.lab || {}, products: [] };
    acc[labId].products.push(p);
    return acc;
  }, {});
  const labGroups = Object.entries(labGroupMap); // [[labId, {lab, products}]]

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

  const filteredLabGroups = labGroups.filter(([, { lab }]) =>
    (selectedLabs.size === 0 || selectedLabs.has(lab?.name)) &&
    (selectedLocations.size === 0 || selectedLocations.has(lab?.city))
  );
  const filteredLabs = labs.filter((l) =>
    selectedLocations.size === 0 || selectedLocations.has(l.city)
  );

  const totalFiltered = filteredLabGroups.length + filteredLabs.length;
  const hasFilters = selectedLabs.size > 0 || selectedLocations.size > 0;
  const hasResults = products.length > 0 || labs.length > 0;
  const clearFilters = () => { setSelectedLabs(new Set()); setSelectedLocations(new Set()); };

  const sidebar = (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-800 text-sm">Filters</h2>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear all</button>
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
          <div className="max-w-7xl mx-auto flex gap-3 flex-wrap sm:flex-nowrap">
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
            <div className="flex-1 relative min-w-0">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={inputVal} onChange={(e) => setInputVal(e.target.value)}
                placeholder="Search tests, packages, labs..."
                className="input pl-9 pr-9 w-full" autoFocus autoComplete="off" />
              {inputVal && (
                <button onClick={() => { setInputVal(''); setResults({ labs: [], products: [], pages: [] }); setActiveProduct(null); }}
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

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Multi-test chips */}
          {multiTests.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Searching for:</span>
              {multiTests.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-800 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {t}
                  <button type="button"
                    onClick={() => {
                      const updated = multiTests.filter((x) => x !== t);
                      setMultiTests(updated);
                    }}
                    className="text-sky-500 hover:text-red-500 transition">
                    <FiX size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {!inputVal.trim() && multiTests.length === 0 ? (
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
              <p className="text-lg font-semibold">No results for &ldquo;{effectiveQuery}&rdquo;{city.trim() ? ` in ${city}` : ''}</p>
              <p className="text-sm text-gray-400 mt-1">Try a different search term or city</p>
              {city.trim() && (
                <button onClick={() => { setCity(''); runSearch(inputVal, ''); }}
                  className="mt-3 text-sm text-primary-600 hover:underline">
                  Search all cities
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-5">

              {/* ── Left: Filters sidebar ── */}
              <aside className="w-52 flex-shrink-0 hidden md:block sticky top-36 self-start">
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

              {/* ── Middle: Compact results list ── */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Summary */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm text-gray-500">
                    <span className="font-bold text-gray-900">{totalFiltered}</span> lab{totalFiltered !== 1 ? 's' : ''} found for &ldquo;{effectiveQuery}&rdquo;
                    {city.trim() && (
                      <span className="inline-flex items-center gap-1 ml-2 bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        <FiMapPin className="text-[10px]" />{city}
                        <button onClick={() => { setCity(''); runSearch(inputVal, '', multiTests); }} className="ml-0.5 hover:text-primary-900"><FiX className="text-[10px]" /></button>
                      </span>
                    )}
                    {hasFilters && <span className="text-primary-600 ml-1 text-xs">(filtered)</span>}
                  </p>
                </div>

                {/* Lab group cards */}
                {filteredLabGroups.length > 0 && (
                  <div className="space-y-4">
                    {filteredLabGroups.map(([labId, { lab, products: labProducts }]) => (
                      <LabGroupCard key={labId} labId={labId} lab={lab} products={labProducts} />
                    ))}
                  </div>
                )}

                {filteredLabs.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Other Labs</h3>
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
