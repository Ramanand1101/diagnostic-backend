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
  FiChevronDown, FiChevronUp, FiChevronRight, FiFilter, FiShoppingCart, FiCheck,
  FiDroplet, FiHome, FiAlertCircle, FiInfo, FiExternalLink,
} from 'react-icons/fi';
import { MdOutlineScience } from 'react-icons/md';
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

  // Fields may come from Algolia (flat) or mongoSearch (nested testMaster) — use both
  const tm = product.testMaster || {};
  const description    = product.description    || tm.description    || '';
  const sampleType     = product.sampleType     || tm.sampleType     || '';
  const reportTime     = product.reportTime     || tm.reportTime     || '';
  const fastingRequired = product.fastingRequired ?? tm.fastingRequired ?? false;
  const homeCollection  = product.homeCollection  ?? tm.homeCollection  ?? false;

  const lab = product.lab || {};
  return (
    <div className="bg-white rounded-xl border border-primary-100 shadow-sm p-5 transition-all">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {product.type && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border capitalize ${TYPE_COLOR[product.type] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
            {product.type}
          </span>
        )}
        {fastingRequired && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-1">
            <FiAlertCircle className="text-[10px]" /> Fasting Required
          </span>
        )}
        {sampleType && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-50 text-gray-500 border border-gray-200 flex items-center gap-1">
            <FiDroplet className="text-[10px]" /> {sampleType}
          </span>
        )}
      </div>
      <h3 className="font-bold text-gray-900 text-base leading-snug mb-3">{product.name}</h3>
      {description ? (
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{description}</p>
      ) : (
        <p className="text-sm text-gray-300 italic mb-4">No description available for this test.</p>
      )}
      <div className="space-y-1.5 mb-4">
        {reportTime && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FiClock className="text-gray-400 flex-shrink-0" />
            <span>Report ready in <strong>{reportTime}</strong></span>
          </div>
        )}
        {homeCollection && (
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

      {/* Lab certifications */}
      {lab.accreditation?.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Certifications</p>
          <div className="flex flex-wrap gap-1.5">
            {lab.accreditation.map((cert) => {
              const meta = {
                'NABL':      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   icon: '🔬' },
                'ISO 15189': { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  icon: '✅' },
                'CAP':       { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '🏆' },
                'NABL-ISO':  { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   icon: '⭐' },
                'JCI':       { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: '🌐' },
              }[cert] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: '✓' };
              return (
                <span key={cert} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${meta.bg} ${meta.text} ${meta.border}`}>
                  <span>{meta.icon}</span> {cert}
                </span>
              );
            })}
          </div>
        </div>
      )}

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

// ── Lab Group Card ─────────────────────────────────────────────────────────────
function LabGroupCard({ labInfo, products, totalSearched, onHoverProduct, onTapProduct, activeProductId }) {
  const { addItem, removeItem, items } = useCart();
  const initial = (labInfo.name || '?')[0].toUpperCase();
  const total = products.reduce((sum, p) => sum + (p.salePrice || p.price || 0), 0);
  const allInCart = products.every((p) => items.some((i) => i._id === p._id));
  const hasAll = totalSearched > 1 && products.length === totalSearched;
  const coverage = totalSearched > 1 ? `${products.length}/${totalSearched} tests` : null;

  const handleAddAll = (e) => {
    e.stopPropagation();
    const toAdd = products.filter((p) => !items.some((i) => i._id === p._id));
    toAdd.forEach((p) => addItem(p));
    if (toAdd.length > 0) toast.success(`${toAdd.length} test${toAdd.length > 1 ? 's' : ''} from ${labInfo.name} added!`, { icon: '🛒' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-300 overflow-hidden shadow-md hover:shadow-xl transition-all">

      {/* ── Lab header ── */}
      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 px-3 py-3 sm:px-4 bg-gray-50 border-b border-gray-200">
        {/* Avatar / Brand logo */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 sm:mt-0 overflow-hidden bg-white border border-gray-200">
          {labInfo.brand?.logo ? (
            <img src={labInfo.brand.logo} alt={labInfo.brand.name || labInfo.name} className="w-full h-full object-contain p-0.5" />
          ) : (
            <div className={`w-full h-full ${labColor(labInfo.name)} flex items-center justify-center text-white font-bold text-sm`}>
              {initial}
            </div>
          )}
        </div>

        {/* Lab info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-bold text-gray-900 text-sm leading-tight">{labInfo.name}</p>
            {labInfo.verificationStatus === 'verified' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-semibold">✓ Verified</span>
            )}
            {labInfo.accreditation?.slice(0, 1).map((a) => (
              <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-semibold">{a}</span>
            ))}
            {coverage && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${
                hasAll ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {coverage}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[11px] text-gray-400">
            {(labInfo.city || labInfo.area || labInfo.address) && (
              <span className="flex items-center gap-0.5">
                <FiMapPin className="text-[10px]" />
                {(() => {
                  // prefer dedicated area field; fall back to old comma-in-address trick
                  const area = labInfo.area || labInfo.address?.split(',')[1]?.trim();
                  if (area && labInfo.city) return `${area}, ${labInfo.city}`;
                  return labInfo.city || '';
                })()}
              </span>
            )}
            {/* View Location tooltip */}
            {(labInfo.address || labInfo.area || labInfo.pincode) && (
              <span className="relative group/loc inline-flex items-center cursor-pointer">
                <span className="flex items-center gap-0.5 text-primary-500 hover:text-primary-700 transition-colors font-medium">
                  <FiMapPin className="text-[10px]" />
                  <span>View Location</span>
                </span>
                <span className="pointer-events-none absolute left-0 top-full mt-1.5 z-50 w-56 bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2.5 leading-relaxed shadow-xl
                  opacity-0 group-hover/loc:opacity-100 scale-95 group-hover/loc:scale-100 transition-all duration-150 origin-top-left">
                  {labInfo.address && <span className="block">{labInfo.address}</span>}
                  {labInfo.area && <span className="block text-gray-300">{labInfo.area}</span>}
                  {labInfo.pincode && <span className="block mt-1 text-gray-300">Pincode: {labInfo.pincode}</span>}
                  {labInfo.city && <span className="block text-gray-400">{[labInfo.city, labInfo.state].filter(Boolean).join(', ')}</span>}
                </span>
              </span>
            )}
            {products.some((p) => p.homeCollection) && <span className="text-green-600">🏠 Home</span>}
            {labInfo.ratingAvg > 0 && <span>★ {labInfo.ratingAvg.toFixed(1)}</span>}
            {labInfo.openingHours && (
              <span className="hidden sm:flex items-center gap-0.5">
                <FiClock className="text-[10px]" /> {labInfo.openingHours}
              </span>
            )}
          </div>
        </div>

        {/* View Lab button */}
        <Link
          href={`/labs/${labInfo.slug}`}
          className="flex-shrink-0 flex items-center gap-1 text-primary-600 hover:text-primary-800 text-xs font-semibold border border-primary-200 hover:border-primary-400 px-2 py-1.5 sm:px-3 rounded-lg transition-colors mt-0.5 sm:mt-0"
        >
          <span className="hidden sm:inline">View Lab</span>
          <FiExternalLink className="text-xs sm:hidden" />
        </Link>
      </div>

      {/* ── Tests list ── */}
      <div className="divide-y divide-gray-200">
        {products.map((p) => {
          const price = p.salePrice || p.price;
          const discount = p.salePrice && p.salePrice < p.price
            ? Math.round(((p.price - p.salePrice) / p.price) * 100)
            : null;
          const inCart = items.some((i) => i._id === p._id);

          return (
            <div
              key={p._id}
              onMouseEnter={() => onHoverProduct(p)}
              onClick={() => { onHoverProduct(p); onTapProduct?.(p); }}
              className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 cursor-pointer transition-colors ${
                activeProductId === p._id ? 'bg-primary-50/40' : 'hover:bg-gray-50'
              }`}
            >
              {/* Test info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                <div className="flex flex-wrap items-center gap-x-1 mt-0.5">
                  {p.fastingRequired && (
                    <span className="text-[10px] text-orange-600 font-medium">Fasting Required</span>
                  )}
                  {p.fastingRequired && p.homeCollection && (
                    <span className="text-[10px] text-gray-300">·</span>
                  )}
                  {p.homeCollection && (
                    <span className="text-[10px] text-green-600 font-medium">Home Collection Available</span>
                  )}
                  {(p.fastingRequired || p.homeCollection) && p.reportTime && (
                    <span className="text-[10px] text-gray-300">·</span>
                  )}
                  {p.reportTime && (
                    <span className="text-[10px] text-blue-600 font-medium flex items-center gap-0.5">
                      <FiClock className="text-[9px]" /> Reports in - {p.reportTime}
                    </span>
                  )}
                </div>
              </div>

              {/* Price + action */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <div className="text-right">
                  {discount && (
                    <span className="text-[9px] sm:text-[10px] font-bold bg-red-500 text-white px-1 sm:px-1.5 py-0.5 rounded-full block mb-0.5 text-center">{discount}%</span>
                  )}
                  <p className="text-xs sm:text-sm font-extrabold text-gray-900">₹{price?.toLocaleString('en-IN')}</p>
                  {discount && <p className="text-[10px] text-gray-400 line-through">₹{p.price?.toLocaleString('en-IN')}</p>}
                </div>
                {inCart ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Link href="/cart"
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                      <FiCheck className="text-[9px]" />
                      <span>View Cart</span>
                    </Link>
                    <button
                      onClick={() => { removeItem(p._id); toast.success(`${p.name} removed`, { icon: '🗑️' }); }}
                      className="flex items-center gap-1 bg-white border border-red-300 text-red-500 hover:bg-red-50 text-[10px] font-semibold px-2 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                      <FiX className="text-[9px]" />
                      <span>Remove</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); addItem(p); toast.success(`${p.name} added!`, { icon: '🛒' }); }}
                    className="flex items-center justify-center gap-1 bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold px-2 py-1.5 sm:px-2.5 rounded-lg transition-colors whitespace-nowrap min-w-[32px]">
                    <FiShoppingCart className="text-[10px]" />
                    <span className="hidden sm:inline">Add</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer: total + Add All ── */}
      {products.length > 1 && (
        <div className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-50 border-t border-gray-200">
          <div>
            <p className="text-[11px] text-gray-400">Total ({products.length} tests)</p>
            <p className="text-sm sm:text-base font-extrabold text-gray-900">₹{total.toLocaleString('en-IN')}</p>
          </div>
          {allInCart ? (
            <Link href="/cart"
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors">
              <FiCheck /> <span className="hidden xs:inline sm:inline">View Cart</span>
              <span className="sm:hidden">Cart</span>
            </Link>
          ) : (
            <button onClick={handleAddAll}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors">
              <FiShoppingCart />
              <span className="hidden sm:inline">Add All to Cart</span>
              <span className="sm:hidden">Add All</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Lab result row (pure lab search) ─────────────────────────────────────────
function LabRow({ lab }) {
  const initial = (lab.name || '?')[0].toUpperCase();
  return (
    <div className="bg-white rounded-xl border border-gray-300 shadow-md p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:shadow-xl transition-all">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${labColor(lab.name)} rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 shadow-sm`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{lab.name}</p>
        <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1">
          {lab.homeCollection && (
            <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-medium">🏠 Home</span>
          )}
          {lab.verificationStatus === 'verified' && (
            <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">✓ Verified</span>
          )}
          {lab.accreditation?.slice(0, 2).map((a) => (
            <span key={a} className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-medium">{a}</span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-[11px] text-gray-400">
          {(lab.city || lab.state) && (
            <span className="flex items-center gap-0.5"><FiMapPin className="text-[10px]" />{[lab.city, lab.state].filter(Boolean).join(', ')}</span>
          )}
          {lab.ratingAvg > 0 && <span>★ {lab.ratingAvg.toFixed(1)}</span>}
          {lab.openingHours && (
            <span className="hidden sm:flex items-center gap-1"><FiClock className="text-[10px]" /> {lab.openingHours}</span>
          )}
        </div>
      </div>
      <Link href={`/labs/${lab.slug}`}
        className="flex-shrink-0 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl transition-colors">
        View Lab
      </Link>
    </div>
  );
}

// ── Group products by lab ─────────────────────────────────────────────────────
function groupByLab(products) {
  const map = new Map();
  products.forEach((p) => {
    const labId = p.lab?._id || p.lab?.slug || p.lab?.name || 'unknown';
    if (!map.has(labId)) map.set(labId, { labInfo: p.lab || {}, products: [] });
    map.get(labId).products.push(p);
  });
  return Array.from(map.values());
}

// ── Main search page ──────────────────────────────────────────────────────────
function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

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
  const [mobileSheet, setMobileSheet] = useState(false);
  const debounceRef = useRef(null);
  const isOwnNavRef = useRef(false);
  const [liveResults, setLiveResults] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const searchWrapRef = useRef(null);
  const suggestTimerRef = useRef(null);

  useEffect(() => {
    if (isOwnNavRef.current) { isOwnNavRef.current = false; return; }
    const tp = searchParams.getAll('test');
    setMultiTests(tp);
    setInputVal(searchParams.get('q') || '');
    setCity(searchParams.get('city') || '');
  }, [searchParams]);

  const runSearch = useCallback(async (q, c, tests = []) => {
    // Include inputVal only when meaningful (≥2 chars) to avoid single-letter noise
    const queries = [...tests];
    if (q.trim().length >= 2 && !queries.some((t) => t.toLowerCase() === q.trim().toLowerCase())) {
      queries.push(q.trim());
    }
    if (queries.length === 0) { setResults({ labs: [], products: [], pages: [] }); setActiveProduct(null); return; }
    setLoading(true);
    setSelectedLabs(new Set());
    setSelectedLocations(new Set());
    setActiveProduct(null);
    try {
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
      setResults({ products: mergedProducts, labs: mergedLabs, pages: [] });
      if (mergedProducts.length > 0) setActiveProduct(mergedProducts[0]);
    } catch {
      setResults({ labs: [], products: [], pages: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  const effectiveQuery = multiTests.length > 0
    ? (inputVal.trim().length >= 2 ? [...multiTests, inputVal.trim()].join(', ') : multiTests.join(', '))
    : inputVal;

  useEffect(() => {
    clearTimeout(debounceRef.current);
    // When chips exist, input is autocomplete-only — user must pick from dropdown
    // When no chips, input is the live search
    const qToSearch = multiTests.length > 0 ? '' : inputVal;
    const hasQuery = multiTests.length > 0 || inputVal.trim().length >= 2;
    if (!hasQuery) { setResults({ labs: [], products: [], pages: [] }); setActiveProduct(null); return; }
    debounceRef.current = setTimeout(() => {
      runSearch(qToSearch, city, multiTests);
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

  /* ── Autocomplete suggest dropdown ── */
  useEffect(() => {
    clearTimeout(suggestTimerRef.current);
    if (inputVal.trim().length < 2) {
      setLiveResults([]);
      setShowDrop(false);
      return;
    }
    suggestTimerRef.current = setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await searchApi.suggest({ q: inputVal.trim(), city, limit: 8 });
        setLiveResults(res.data.tests || []);
        setShowDrop(true);
      } catch {
        setLiveResults([]);
      } finally {
        setSuggesting(false);
      }
    }, 280);
    return () => clearTimeout(suggestTimerRef.current);
  }, [inputVal, city]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const products = results.products || [];
  const labs = results.labs || [];

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

  const labGroups = groupByLab(filteredProducts).sort((a, b) => b.products.length - a.products.length);
  const totalSearched = multiTests.length > 0 ? multiTests.length : 1;
  const totalGroupCount = labGroups.length + filteredLabs.length;
  const hasFilters = selectedLabs.size > 0 || selectedLocations.size > 0;
  const hasResults = products.length > 0 || labs.length > 0;
  const clearFilters = () => { setSelectedLabs(new Set()); setSelectedLocations(new Set()); };

  const pickSuggestion = (name) => {
    if (!multiTests.includes(name)) setMultiTests((prev) => [...prev, name]);
    setInputVal('');
    setShowDrop(false);
  };

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
      <main className="min-h-screen bg-gray-200">

        {/* ── Top search bar ── */}
        <div className="bg-white border-b border-gray-300 px-3 sm:px-4 py-3 sticky top-14 sm:top-16 z-30">
          <div className="max-w-7xl mx-auto space-y-2 sm:space-y-0 sm:flex sm:gap-3">

            {/* Search input — full width on mobile, flex-1 on sm+ */}
            <div className="relative min-w-0 sm:flex-1" ref={searchWrapRef}>
              {suggesting
                ? <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                : <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              }
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onFocus={() => { if (inputVal.trim().length >= 2 && liveResults.length > 0) setShowDrop(true); }}
                placeholder={multiTests.length > 0 ? 'Type another test to search alongside…' : 'Search tests, packages, labs...'}
                className="input pl-9 pr-9 w-full"
                autoFocus
                autoComplete="off"
              />
              {inputVal && (
                <button
                  onClick={() => { setInputVal(''); setShowDrop(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <FiX className="text-sm" />
                </button>
              )}

              {/* ── Autocomplete dropdown ── */}
              {showDrop && (liveResults.length > 0 || suggesting) && (
                <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-[340px] overflow-y-auto">
                  {suggesting && liveResults.length === 0 && (
                    <div className="px-4 py-4 text-sm text-gray-400 flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0" />
                      Searching…
                    </div>
                  )}
                  {liveResults.length > 0 && (
                    <>
                      <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                        Tests &amp; Packages{city ? ` in ${city}` : ''}
                        {multiTests.length > 0 && ' — tap to add'}
                      </p>
                      {liveResults.map((t) => {
                        const already = multiTests.includes(t.name);
                        return (
                          <button key={t.name} type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickSuggestion(t.name)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 transition text-left ${already ? 'bg-sky-50 opacity-70' : 'hover:bg-sky-50'}`}>
                            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
                              <MdOutlineScience className="text-sky-600 text-base" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                {t.labCount != null && (
                                  <span className="inline-flex items-center gap-0.5 bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-medium">
                                    {t.labCount} lab{t.labCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {t.minPrice != null && (
                                  <><span>·</span><span className="font-medium text-gray-600">
                                    {t.minPrice === t.maxPrice
                                      ? `₹${t.minPrice.toLocaleString('en-IN')}`
                                      : `₹${t.minPrice.toLocaleString('en-IN')} – ₹${t.maxPrice.toLocaleString('en-IN')}`}
                                  </span></>
                                )}
                                {t.reportTime && <><span>·</span><span>{t.reportTime}</span></>}
                              </p>
                            </div>
                            {already
                              ? <span className="text-[10px] text-sky-500 font-semibold shrink-0">Added ✓</span>
                              : <FiChevronRight size={14} className="text-gray-300 shrink-0" />
                            }
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* City + Filter button row (below search on mobile, beside on sm+) */}
            <div className="flex gap-2 sm:flex-shrink-0">
              <div className="relative flex-1 sm:flex-none">
                <FiMapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyCity()}
                  placeholder="City"
                  className="input pl-8 w-full sm:w-32"
                />
              </div>
              {city && (
                <button
                  onClick={() => { setCity(''); runSearch(inputVal, ''); }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <FiX />
                </button>
              )}
              {hasResults && (
                <button
                  onClick={() => setMobileSidebar((v) => !v)}
                  className="md:hidden flex-shrink-0 px-3 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 flex items-center gap-1.5">
                  <FiFilter />
                  <span className="text-xs">Filters</span>
                  {hasFilters && (
                    <span className="w-4 h-4 bg-primary-600 text-white text-[10px] rounded-full flex items-center justify-center">
                      {selectedLabs.size + selectedLocations.size}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

          {/* Multi-test chips */}
          {multiTests.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Searching:</span>
              {multiTests.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 bg-sky-100 text-sky-800 text-xs font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full">
                  {t}
                  <button type="button"
                    onClick={() => setMultiTests(multiTests.filter((x) => x !== t))}
                    className="text-sky-500 hover:text-red-500 transition">
                    <FiX size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {!inputVal.trim() && multiTests.length === 0 ? (
            <div className="text-center py-20 sm:py-24 text-gray-400">
              <FiSearch className="text-4xl sm:text-5xl mx-auto mb-4 opacity-20" />
              <p className="text-sm sm:text-base font-medium">Search for tests, packages or labs</p>
              <p className="text-xs sm:text-sm mt-1 px-4">e.g. &ldquo;CBC Test&rdquo;, &ldquo;Full Body Checkup&rdquo;, &ldquo;Apollo Labs&rdquo;</p>
            </div>

          ) : loading ? (
            <div className="flex items-center justify-center gap-2 py-20 sm:py-24 text-gray-400">
              <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Searching{city.trim() ? ` in ${city}` : ''}…</span>
            </div>

          ) : !hasResults ? (
            city.trim() ? (
              <div className="text-center py-20 sm:py-24 px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 mb-4">
                  <FiMapPin className="text-3xl text-amber-400" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-1">
                  Service not available in {city}
                </h2>
                <p className="text-sm text-gray-400 max-w-xs mx-auto mb-5">
                  We don&apos;t have any partner labs in <span className="font-semibold text-gray-600">{city}</span> yet. Try searching in a nearby city or browse all cities.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => { setCity(''); runSearch(inputVal, '', multiTests); }}
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors">
                    Search all cities
                  </button>
                  <Link href="/labs" className="px-5 py-2 border border-gray-200 text-gray-600 hover:border-gray-300 text-sm font-medium rounded-xl transition-colors">
                    Browse all labs
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 sm:py-24 text-gray-500 px-4">
                <FiSearch className="text-4xl mx-auto mb-3 opacity-20" />
                <p className="text-base sm:text-lg font-semibold">No results for &ldquo;{effectiveQuery}&rdquo;</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Try a different search term</p>
              </div>
            )

          ) : (
            <div className="flex gap-4 lg:gap-5">

              {/* ── Left: Filters sidebar (desktop) ── */}
              <aside className="w-48 lg:w-52 flex-shrink-0 hidden md:block sticky top-32 self-start">
                <div className="bg-white rounded-xl border border-gray-300 shadow-md p-4 max-h-[calc(100vh-9rem)] overflow-y-auto">
                  {sidebar}
                </div>
              </aside>

              {/* ── Mobile sidebar overlay ── */}
              {mobileSidebar && (
                <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileSidebar(false)}>
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="absolute left-0 top-0 bottom-0 w-72 bg-white p-5 overflow-y-auto shadow-xl"
                    onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bold text-gray-900">Filters</h2>
                      <button onClick={() => setMobileSidebar(false)} className="text-gray-400 hover:text-gray-600 p-1"><FiX /></button>
                    </div>
                    {sidebar}
                  </div>
                </div>
              )}

              {/* ── Middle: Lab-grouped results ── */}
              <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">

                {/* Summary */}
                <div className="flex items-start sm:items-center justify-between flex-wrap gap-2">
                  <p className="text-xs sm:text-sm text-gray-500">
                    <span className="font-bold text-gray-900">{totalGroupCount}</span> lab{totalGroupCount !== 1 ? 's' : ''} for &ldquo;{effectiveQuery}&rdquo;
                    {city.trim() && (
                      <span className="inline-flex items-center gap-1 ml-1.5 bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        <FiMapPin className="text-[10px]" />{city}
                        <button onClick={() => { setCity(''); runSearch(inputVal, ''); }} className="ml-0.5 hover:text-primary-900"><FiX className="text-[10px]" /></button>
                      </span>
                    )}
                    {hasFilters && <span className="text-primary-600 ml-1 text-xs">(filtered)</span>}
                  </p>
                  {multiTests.length > 1 && labGroups.some((g) => g.products.length === totalSearched) && (
                    <span className="text-[11px] sm:text-xs text-green-700 bg-green-50 border border-green-200 px-2 sm:px-2.5 py-1 rounded-full font-medium">
                      ✓ {labGroups.filter((g) => g.products.length === totalSearched).length} lab{labGroups.filter((g) => g.products.length === totalSearched).length > 1 ? 's' : ''} have all {totalSearched} tests
                    </span>
                  )}
                </div>

                {/* Lab groups */}
                {labGroups.length > 0 && (
                  <div className="space-y-2.5 sm:space-y-3">
                    {multiTests.length > 1 && (
                      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Tests &amp; Packages — grouped by lab</h3>
                    )}
                    {labGroups.map((group, idx) => (
                      <LabGroupCard
                        key={group.labInfo._id || group.labInfo.slug || idx}
                        labInfo={group.labInfo}
                        products={group.products}
                        totalSearched={totalSearched}
                        onHoverProduct={setActiveProduct}
                        onTapProduct={() => setMobileSheet(true)}
                        activeProductId={activeProduct?._id}
                      />
                    ))}
                  </div>
                )}

                {/* Pure lab results */}
                {filteredLabs.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Labs</h3>
                    {filteredLabs.map((lab) => <LabRow key={lab._id || lab.objectID} lab={lab} />)}
                  </div>
                )}

                {totalGroupCount === 0 && hasFilters && (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">No results match the selected filters.</p>
                    <button onClick={clearFilters} className="mt-2 text-sm text-primary-600 hover:underline">Clear filters</button>
                  </div>
                )}
              </div>

              {/* ── Right: Description panel (lg+ only) ── */}
              {filteredProducts.length > 0 && (
                <aside className="w-64 xl:w-72 flex-shrink-0 hidden lg:block sticky top-32 self-start">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">About this test</p>
                  <DescriptionPanel product={activeProduct} />
                </aside>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Mobile: About This Test bottom sheet ── */}
      {mobileSheet && activeProduct && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileSheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">About This Test</p>
              <button
                onClick={() => setMobileSheet(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <FiX className="text-sm" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <DescriptionPanel product={activeProduct} />
            </div>
          </div>
        </div>
      )}

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
