'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCity } from '@/context/CityContext';
import { useCart } from '@/context/CartContext';
import { productApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiChevronRight, FiActivity } from 'react-icons/fi';
import { MdOutlineBloodtype, MdOutlinePregnantWoman, MdOutlineVaccines } from 'react-icons/md';
import { TbHeartbeat } from 'react-icons/tb';
import {
  GiLiver, GiKidneys, GiHeartOrgan, GiLungs, GiSkeleton, GiCancer, GiMale,
  GiVirus, GiChemicalDrop, GiBrain, GiStomach, GiEyeball, GiFruitBowl, GiTestTubes,
} from 'react-icons/gi';

// Keyword → icon rules, checked in order against "category name + test name" — the
// first match wins, so put more specific organs/conditions before generic ones.
const ICON_RULES = [
  { keys: ['liver', 'hepat'], icon: GiLiver, color: 'text-green-600', bg: 'bg-green-50' },
  { keys: ['kidney', 'renal'], icon: GiKidneys, color: 'text-orange-600', bg: 'bg-orange-50' },
  { keys: ['thyroid'], icon: TbHeartbeat, color: 'text-pink-600', bg: 'bg-pink-50' },
  { keys: ['cardiac', 'heart', 'lipid', 'cholesterol'], icon: GiHeartOrgan, color: 'text-red-600', bg: 'bg-red-50' },
  { keys: ['diabet', 'glucose', 'sugar', 'hba1c', 'insulin'], icon: MdOutlineBloodtype, color: 'text-purple-600', bg: 'bg-purple-50' },
  { keys: ['vitamin', 'mineral', 'nutrition'], icon: GiFruitBowl, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { keys: ['lung', 'respiratory', 'pulmonary'], icon: GiLungs, color: 'text-sky-600', bg: 'bg-sky-50' },
  { keys: ['bone', 'joint', 'ortho', 'calcium', 'arthrit'], icon: GiSkeleton, color: 'text-slate-600', bg: 'bg-slate-100' },
  { keys: ['cancer', 'tumor', 'tumour', 'marker', 'oncology'], icon: GiCancer, color: 'text-rose-600', bg: 'bg-rose-50' },
  { keys: ['women', 'pregnan', 'fertility', 'prenatal', 'gynae'], icon: MdOutlinePregnantWoman, color: 'text-pink-500', bg: 'bg-pink-50' },
  { keys: ['men', 'prostate', 'testosterone'], icon: GiMale, color: 'text-blue-600', bg: 'bg-blue-50' },
  { keys: ['infect', 'fever', 'viral', 'covid', 'dengue', 'malaria', 'typhoid'], icon: GiVirus, color: 'text-purple-600', bg: 'bg-purple-50' },
  { keys: ['allerg'], icon: GiChemicalDrop, color: 'text-amber-600', bg: 'bg-amber-50' },
  { keys: ['brain', 'neuro'], icon: GiBrain, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { keys: ['stomach', 'gastro', 'digest', 'abdomen'], icon: GiStomach, color: 'text-orange-600', bg: 'bg-orange-50' },
  { keys: ['eye', 'vision', 'ophthal'], icon: GiEyeball, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { keys: ['vaccine', 'immun'], icon: MdOutlineVaccines, color: 'text-teal-600', bg: 'bg-teal-50' },
  { keys: ['blood', 'cbc', 'hematology', 'anemia', 'haemoglobin', 'hemoglobin'], icon: MdOutlineBloodtype, color: 'text-red-500', bg: 'bg-red-50' },
];
const DEFAULT_ICON = { icon: GiTestTubes, color: 'text-primary-600', bg: 'bg-primary-50' };

function getTestIcon(product) {
  const haystack = `${product.testMaster?.category?.name || ''} ${product.name || ''}`.toLowerCase();
  return ICON_RULES.find((rule) => rule.keys.some((k) => haystack.includes(k))) || DEFAULT_ICON;
}

const CARDS_PER_VIEW = 5;

function TestCardSkeleton() {
  return (
    <div className="flex-none snap-start w-[45%] sm:w-[31%] lg:w-[calc(20%-1rem)] bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
      <div className="w-14 h-14 rounded-full bg-gray-100 mx-auto" />
      <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto" />
      <div className="h-4 bg-gray-100 rounded w-1/2 mx-auto" />
      <div className="h-9 bg-gray-100 rounded-lg w-full mt-2" />
    </div>
  );
}

function TestCard({ product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { icon: Icon, color, bg } = getTestIcon(product);

  const mrp = product.price || 0;
  const sale = product.salePrice && product.salePrice < mrp ? product.salePrice : mrp;
  const hasDiscount = sale < mrp;
  const discountPercent = product.discountPercent || (hasDiscount ? Math.round((1 - sale / mrp) * 100) : 0);

  const handleBookNow = () => {
    addItem(product);
    toast.success(`${product.name} added to cart!`, { icon: '🛒' });
    router.push('/cart');
  };

  return (
    <div className="flex-none snap-start w-[45%] sm:w-[31%] lg:w-[calc(20%-1rem)] bg-white rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-lg transition-all p-5 flex flex-col text-center">
      <Link href={`/products/${product.slug}`} className="flex flex-col items-center flex-1">
        <div className={`w-14 h-14 ${bg} rounded-full flex items-center justify-center mb-3`}>
          <Icon className={`text-2xl ${color}`} />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <div className="flex items-baseline justify-center gap-1.5 flex-wrap mb-1">
          {hasDiscount && <span className="text-xs line-through text-gray-400">₹{mrp.toLocaleString('en-IN')}</span>}
          <span className="text-lg font-extrabold text-primary-700">₹{sale.toLocaleString('en-IN')}</span>
          {discountPercent > 0 && (
            <span className="text-[11px] font-bold bg-secondary-100 text-secondary-700 px-1.5 py-0.5 rounded-full">
              {discountPercent}% off
            </span>
          )}
        </div>
      </Link>
      <button
        onClick={handleBookNow}
        className="mt-3 w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold text-sm transition-colors shadow-sm"
      >
        Book Now
      </button>
    </div>
  );
}

export default function RecommendedTestsCarousel() {
  const { city } = useCity();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    setLoading(true);
    const base = { isActive: 'true', limit: 15 };
    if (city) base.city = city;

    productApi.getAll({ ...base, featured: 'true' })
      .then((res) => {
        const items = res.data.items || [];
        if (items.length > 0) { setProducts(items); return; }
        return productApi.getAll(base).then((r2) => setProducts(r2.data.items || []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [city]);

  const dotCount = Math.max(1, Math.ceil(products.length / CARDS_PER_VIEW));

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
    if (maxScroll <= 0) { setActiveDot(0); return; }
    setActiveDot(Math.min(dotCount - 1, Math.round((el.scrollLeft / maxScroll) * (dotCount - 1))));
  };

  useEffect(() => { updateScrollState(); }, [products]); // eslint-disable-line react-hooks/exhaustive-deps

  const scrollByPage = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const scrollToDot = (i) => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: (maxScroll * i) / Math.max(1, dotCount - 1), behavior: 'smooth' });
  };

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-14 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Discover Our Highly Recommended Lab Tests</h2>
          <p className="text-sm text-gray-500 mt-1">Handpicked tests across every health category, at trusted NABL-certified labs</p>
        </div>

        <div className="relative">
          {!loading && canScrollLeft && (
            <button
              onClick={() => scrollByPage(-1)}
              aria-label="Scroll left"
              className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-100 items-center justify-center text-gray-500 hover:text-primary-600 hover:border-primary-200 transition-colors"
            >
              <FiChevronLeft />
            </button>
          )}
          {!loading && canScrollRight && (
            <button
              onClick={() => scrollByPage(1)}
              aria-label="Scroll right"
              className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-100 items-center justify-center text-gray-500 hover:text-primary-600 hover:border-primary-200 transition-colors"
            >
              <FiChevronRight />
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {loading
              ? [...Array(5)].map((_, i) => <TestCardSkeleton key={i} />)
              : products.map((p) => <TestCard key={p._id} product={p} />)}
          </div>
        </div>

        {!loading && dotCount > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {[...Array(dotCount)].map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToDot(i)}
                aria-label={`Go to page ${i + 1}`}
                className={`h-2 rounded-full transition-all ${activeDot === i ? 'w-6 bg-primary-600' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
              />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-14 text-gray-400">
            <FiActivity className="text-4xl mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">No recommended tests available right now</p>
          </div>
        )}
      </div>
    </section>
  );
}
