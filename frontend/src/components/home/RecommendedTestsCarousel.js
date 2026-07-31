'use client';
import { useState, useEffect, useRef } from 'react';
import { useCity } from '@/context/CityContext';
import { productApi } from '@/lib/api';
import { FiChevronLeft, FiChevronRight, FiActivity } from 'react-icons/fi';
import ProductCard from '@/components/product/ProductCard';

const CARDS_PER_VIEW = 5;

function TestCardSkeleton() {
  return (
    <div className="flex-none snap-start w-[70%] sm:w-[45%] lg:w-[calc(20%-1rem)] bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-100" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-11 bg-gray-100 rounded-lg w-full mt-2" />
      </div>
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
    // Guards against the city changing again (e.g. '' -> detected city) before this
    // request resolves — without it, a slower unfiltered request can land after a
    // faster city-filtered one and overwrite it with a mixed-city result set.
    let cancelled = false;
    setLoading(true);
    const base = { isActive: 'true', limit: 15 };
    if (city) base.city = city;

    productApi.getAll({ ...base, featured: 'true' })
      .then((res) => {
        const items = res.data.items || [];
        if (items.length > 0) { if (!cancelled) setProducts(items); return; }
        return productApi.getAll(base).then((r2) => { if (!cancelled) setProducts(r2.data.items || []); });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
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
              : products.map((p) => (
                  <div key={p._id} className="flex-none snap-start w-[70%] sm:w-[45%] lg:w-[calc(20%-1rem)]">
                    <ProductCard product={p} />
                  </div>
                ))}
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
