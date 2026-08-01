'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useCity } from '@/context/CityContext';
import { labApi } from '@/lib/api';
import LabCard from '@/components/lab/LabCard';
import { FiArrowRight, FiMapPin, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const CARDS_PER_VIEW = 4;

function LabSkeleton() {
  return (
    <div className="flex-none snap-start w-[70%] sm:w-[45%] lg:w-[calc(25%-1.125rem)] bg-white rounded-2xl border border-gray-100 p-3 space-y-3 animate-pulse">
      <div className="aspect-[4/3] bg-gray-100 rounded-2xl" />
      <div className="h-4 bg-gray-100 rounded w-2/3" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-9 bg-gray-100 rounded-xl w-full mt-2" />
    </div>
  );
}

export default function FeaturedLabsSection() {
  const { city, setCity } = useCity();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalInCity, setTotalInCity] = useState(0);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    // Guards against the city changing again (e.g. '' -> detected/saved city) before
    // this request resolves — without it, a slower unfiltered request can land after
    // a faster city-filtered one and overwrite it with labs from every city.
    let cancelled = false;
    setLoading(true);
    const base = { approved: 'true', limit: 12 };
    if (city) base.city = city;

    labApi.getAll({ ...base, featured: 'true' })
      .then((res) => {
        const items = res.data.items || res.data.labs || [];
        if (items.length > 0) {
          if (!cancelled) { setLabs(items); setTotalInCity(res.data.total || 0); }
          return;
        }
        // No featured labs in this city — fallback to any approved labs
        return labApi.getAll(base).then((r2) => {
          if (!cancelled) { setLabs(r2.data.items || r2.data.labs || []); setTotalInCity(r2.data.total || 0); }
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [city]);

  const dotCount = Math.max(1, Math.ceil(labs.length / CARDS_PER_VIEW));

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
    if (maxScroll <= 0) { setActiveDot(0); return; }
    setActiveDot(Math.min(dotCount - 1, Math.round((el.scrollLeft / maxScroll) * (dotCount - 1))));
  };

  useEffect(() => { updateScrollState(); }, [labs]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <section className="py-6 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {city ? `Top Labs in ${city}` : 'Top Diagnostic Labs'}
              </h2>

              {city && totalInCity > 6 && (
                <span className="text-xs bg-primary-100 text-primary-700 font-semibold px-2 py-0.5 rounded-full">
                  {totalInCity}+ labs
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">
                {city
                  ? `Admin-curated top-rated labs in ${city}`
                  : 'Admin-curated top-rated labs across India'}
              </p>
              {city && (
                <button
                  onClick={() => setCity('')}
                  className="text-xs text-primary-600 hover:text-primary-800 underline underline-offset-2 whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <Link
            href={city ? `/labs?city=${encodeURIComponent(city)}` : '/labs'}
            className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 group shrink-0"
          >
            View all <FiArrowRight className="text-sm group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="flex gap-4 sm:gap-5 overflow-x-hidden">
            {[...Array(4)].map((_, i) => <LabSkeleton key={i} />)}
          </div>
        ) : labs.length > 0 ? (
          <div className="relative">
            {canScrollLeft && (
              <button
                onClick={() => scrollByPage(-1)}
                aria-label="Scroll left"
                className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-100 items-center justify-center text-gray-500 hover:text-primary-600 hover:border-primary-200 transition-colors"
              >
                <FiChevronLeft />
              </button>
            )}
            {canScrollRight && (
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
              className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {labs.map((lab) => (
                <div key={lab._id} className="flex-none snap-start w-[70%] sm:w-[45%] lg:w-[calc(25%-1.125rem)]">
                  <LabCard lab={lab} />
                </div>
              ))}
            </div>

            {dotCount > 1 && (
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
          </div>
        ) : (
          <div className="text-center py-14 text-gray-400">
            <FiMapPin className="text-4xl mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">No labs found{city ? ` in ${city}` : ''}</p>
            {city && (
              <button
                onClick={() => setCity('')}
                className="mt-3 text-sm text-primary-600 hover:underline"
              >
                Show all cities
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
