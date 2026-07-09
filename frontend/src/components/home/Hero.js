'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiChevronLeft, FiChevronRight, FiSearch, FiMapPin, FiX } from 'react-icons/fi';
import { MdOutlineScience } from 'react-icons/md';
import { heroSlideApi, searchApi } from '@/lib/api';
import { useCity } from '@/context/CityContext';

import CityPickerModal from '@/components/layout/CityPickerModal';


const TYPEWRITER = ['CBC Test', 'Thyroid Panel', 'Vitamin D', 'HbA1c', 'Full Body Checkup', 'Lipid Profile'];

export default function HeroSlider() {
  const { city: contextCity } = useCity();
  const city = contextCity || '';

  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [slides, setSlides] = useState([]);
  const [loadingSlides, setLoadingSlides] = useState(true);
  const [current, setCurrent] = useState(0);

  // search bar
  const [query, setQuery] = useState('');
  const [popularTests, setPopularTests] = useState([]);
  const [liveResults, setLiveResults] = useState({ tests: [], labs: [] });
  const [showDrop, setShowDrop] = useState(false);
  const [searching, setSearching] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const searchWrapRef = useRef(null);
  const cityBtnRef = useRef(null);
  const searchBtnRef = useRef(null);
  const [dropLeft, setDropLeft] = useState(0);
  const [dropRight, setDropRight] = useState(0);

  // typewriter
  const [placeholder, setPlaceholder] = useState('Search for CBC Test...');
  const [swIdx, setSwIdx] = useState(0);
  const [swChar, setSwChar] = useState(0);
  const [swDel, setSwDel] = useState(false);

  const router = useRouter();


  /* ── Slides ── */
  useEffect(() => {
    heroSlideApi.getAll({ active: 'true' })
      .then((res) => { if (Array.isArray(res.data) && res.data.length) setSlides(res.data); })
      .catch(() => {})
      .finally(() => setLoadingSlides(false));
  }, []);

  /* ── Typewriter ── */
  useEffect(() => {
    if (query) return; // pause when user is typing
    const word = 'Search for ' + TYPEWRITER[swIdx];
    const speed = swDel ? 40 : 90;
    const pause = !swDel && swChar === word.length ? 1200 : 0;
    const t = setTimeout(() => {
      if (!swDel && swChar < word.length) { setPlaceholder(word.slice(0, swChar + 1)); setSwChar(c => c + 1); }
      else if (!swDel && swChar === word.length) setSwDel(true);
      else if (swDel && swChar > 0) { setPlaceholder(word.slice(0, swChar - 1)); setSwChar(c => c - 1); }
      else { setSwDel(false); setSwIdx(i => (i + 1) % TYPEWRITER.length); }
    }, pause || speed);
    return () => clearTimeout(t);
  }, [swChar, swDel, swIdx, query]);

  /* ── Fetch popular tests from DB on mount ── */
  useEffect(() => {
    searchApi.popular({ limit: 10 })
      .then((res) => setPopularTests(res.data.tests || []))
      .catch(() => {});
  }, []);

  /* ── Re-fetch when city changes ── */
  useEffect(() => {
    if (!city) return;
    searchApi.popular({ city, limit: 10 })
      .then((res) => setPopularTests(res.data.tests || []))
      .catch(() => {});
  }, [city]);

  /* ── Auto-play ── */
  const nextSlide = useCallback(() => {
    if (slides.length > 1) setCurrent(c => (c + 1) % slides.length);
  }, [slides.length]);
  const prevSlide = () => {
    if (slides.length > 1) setCurrent(c => (c - 1 + slides.length) % slides.length);
  };
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(nextSlide, 4500);
    return () => clearInterval(t);
  }, [nextSlide, slides.length]);

  /* ── Live search dropdown ── */
  useEffect(() => {
    if (query.trim().length < 2) {
      setLiveResults({ tests: [], labs: [] });
      // keep dropdown open if focused (shows popular tests)
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchApi.suggest({ q: query.trim(), city, limit: 10 });
        setLiveResults({
          tests: res.data.tests || [],
          labs: (res.data.labs || []).slice(0, 2),
        });
        setShowDrop(true);
      } catch {
        setLiveResults({ tests: [], labs: [] });
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query, city]);

  const showPopular = inputFocused && query.trim().length < 2;
  const hasResults  = liveResults.tests.length > 0 || liveResults.labs.length > 0;

  /* ── Measure city + search button widths for dropdown positioning ── */
  useEffect(() => {
    const measure = () => {
      if (cityBtnRef.current) setDropLeft(cityBtnRef.current.offsetWidth);
      if (searchBtnRef.current) setDropRight(searchBtnRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [city]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowDrop(false);
        setInputFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setShowDrop(false);
    const q = query.trim();
    router.push(
      q ? `/search?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}`
        : `/labs${city ? `?city=${encodeURIComponent(city)}` : ''}`
    );
  };

  const goTo = (href) => { setShowDrop(false); setInputFocused(false); setQuery(''); router.push(href); };

  const fmtPrice = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
  const priceRange = (min, max) =>
    min === max ? fmtPrice(min) : `${fmtPrice(min)} – ${fmtPrice(max)}`;

  return (
    <div>
      {/* Padded wrapper — gives space on both sides */}
      <div className="px-3 sm:px-6 lg:px-10 pt-3 pb-1 bg-gray-50">
      <div className="relative w-full bg-sky-900 aspect-[16/5] min-h-[320px] rounded-2xl shadow-xl">

        {/* Slide strip */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}>
            {!loadingSlides && slides.length > 0
              ? slides.map((slide) => (
                  <div key={slide._id} className="relative min-w-full h-full flex-shrink-0">
                    <Image src={slide.imageUrl} alt={slide.title} fill unoptimized
                      className="object-cover opacity-80" priority={slide.sortOrder === 0} />
                  </div>
                ))
              : <div className="min-w-full h-full bg-gradient-to-br from-sky-900 to-blue-800" />
            }
          </div>
          <div className="absolute inset-0 bg-black/35" />
        </div>

        {/* Overlay — pointer-events-none except form */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-8 sm:px-16 lg:px-24 pointer-events-none">
          <h1 className="text-white font-bold text-2xl md:text-4xl text-center drop-shadow-lg mb-2">
            Book Lab Tests at Home
          </h1>
          <p className="text-slate-200 text-sm md:text-base text-center mb-5 drop-shadow">
            NABL certified labs · Reports in 6 hours · Free sample collection
          </p>

          {/* Form + live dropdown wrapper */}
          <div className="relative w-full max-w-3xl pointer-events-auto" ref={searchWrapRef}>
            <form onSubmit={handleSearch}
              className="flex items-stretch bg-white rounded-full shadow-2xl overflow-hidden">

              {/* City button — LEFT side */}
              <div ref={cityBtnRef} className="border-r border-gray-200 flex-shrink-0">
                <button type="button" onClick={() => setCityModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition whitespace-nowrap h-full">
                  <FiMapPin size={15} className="text-sky-500 shrink-0" />
                  <span className="max-w-[90px] truncate">{city || 'Select City'}</span>
                  <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Search input */}
              <div className="flex items-center flex-1 px-3 relative">
                {searching
                  ? <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0 mr-2" />
                  : <FiSearch size={16} className="text-gray-400 shrink-0 mr-2" />
                }
                <input type="text" value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && (setShowDrop(false), setInputFocused(false))}
                  onFocus={() => { setInputFocused(true); setShowDrop(true); }}
                  placeholder={placeholder}
                  className="flex-1 py-5 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
                  autoComplete="off"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(''); setShowDrop(false); }}
                    className="text-gray-300 hover:text-gray-500 shrink-0 ml-1">
                    <FiX size={14} />
                  </button>
                )}
              </div>

              <button ref={searchBtnRef} type="submit"
                className="bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold text-sm px-6 transition shrink-0">
                Search
              </button>
            </form>

            {/* ── Dropdown: popular on focus OR live results on type ── */}
            {showDrop && (showPopular || hasResults || searching) && (
              <div className="absolute top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-[420px] overflow-y-auto"
                style={{ left: dropLeft, right: dropRight }}>

                {/* Popular tests from DB — shown when query is empty */}
                {showPopular && popularTests.length > 0 && (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      Popular Tests{city ? ` in ${city}` : ''}
                    </p>
                    {popularTests.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goTo(`/search?q=${encodeURIComponent(t.name)}${city ? `&city=${encodeURIComponent(city)}` : ''}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sky-50 transition text-left"
                      >
                        <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
                          <MdOutlineScience className="text-sky-600 text-base" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 uppercase tracking-wide">{t.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            <span className="bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-medium">{t.labCount} lab{t.labCount !== 1 ? 's' : ''}</span>
                            {t.minPrice && <span>from ₹{t.minPrice.toLocaleString('en-IN')}</span>}
                            {t.reportTime && <span>· {t.reportTime}</span>}
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* Loading state for popular */}
                {showPopular && popularTests.length === 0 && (
                  <div className="px-4 py-4 text-center text-xs text-gray-400">Loading popular tests…</div>
                )}

                {/* Live results — shown when typing */}
                {!showPopular && (
                  <>
                    {!hasResults && !searching && (
                      <div className="px-4 py-5 text-center text-sm text-gray-400">
                        No results for &ldquo;{query}&rdquo;{city ? ` in ${city}` : ''}
                      </div>
                    )}

                    {liveResults.tests.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                          Tests &amp; Packages{city ? ` in ${city}` : ''}
                        </p>
                        {liveResults.tests.map((t) => (
                          <button key={t.name} type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => goTo(`/search?q=${encodeURIComponent(t.name)}${city ? `&city=${encodeURIComponent(city)}` : ''}`)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sky-50 transition text-left">
                            <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center shrink-0">
                              <MdOutlineScience className="text-sky-600 text-base" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                              <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <span className="inline-flex items-center gap-0.5 bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded font-medium">
                                  {t.labCount} lab{t.labCount !== 1 ? 's' : ''}
                                </span>
                                <span>·</span>
                                <span className="font-medium text-gray-600">{priceRange(t.minPrice, t.maxPrice)}</span>
                                {t.reportTime && <><span>·</span><span>{t.reportTime}</span></>}
                              </p>
                            </div>
                            <FiChevronRight size={14} className="text-gray-300 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {liveResults.labs.length > 0 && (
                      <div className={liveResults.tests.length > 0 ? 'border-t border-gray-50' : ''}>
                        <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Labs</p>
                        {liveResults.labs.map((lab) => (
                          <button key={lab._id || lab.objectID} type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => goTo(`/labs/${lab.slug || lab._id}`)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-sky-50 transition text-left">
                            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                              <FiMapPin className="text-primary-600 text-sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{lab.name}</p>
                              <p className="text-xs text-gray-400">{lab.city}{lab.ratingAvg ? ` · ★ ${lab.ratingAvg}` : ''}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {hasResults && (
                      <Link href={`/search?q=${encodeURIComponent(query)}${city ? `&city=${encodeURIComponent(city)}` : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setShowDrop(false); setInputFocused(false); }}
                        className="flex items-center justify-center gap-1.5 px-4 py-3 border-t border-gray-100 text-sm font-medium text-sky-600 hover:bg-sky-50 transition">
                        <FiSearch size={13} />
                        See all results for &ldquo;{query}&rdquo;{city ? ` in ${city}` : ''}
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Arrows — z-30 */}
        {slides.length > 1 && (
          <>
            <button onClick={prevSlide} aria-label="Previous slide"
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg z-30 transition">
              <FiChevronLeft size={18} />
            </button>
            <button onClick={nextSlide} aria-label="Next slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg z-30 transition">
              <FiChevronRight size={18} />
            </button>
          </>
        )}

        {/* Dots — z-30 */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-30">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'}`} />
            ))}
          </div>
        )}
      </div>
      </div>{/* end padded wrapper */}

      {/* Promo bar */}
      <div className="bg-white border-y border-gray-100 py-2.5">
        <p className="text-center text-sm text-gray-600">
          Get <span className="text-secondary-600 font-bold">10% OFF*</span>
          {' '}on orders above ₹500 &nbsp;|&nbsp; Use:{' '}
          <span className="font-bold text-gray-900 tracking-wide">WELCOME10</span>
        </p>
      </div>

      <CityPickerModal open={cityModalOpen} onClose={() => setCityModalOpen(false)} />
    </div>
  );
}
