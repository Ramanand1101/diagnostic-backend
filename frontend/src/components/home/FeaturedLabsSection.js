'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCity } from '@/context/CityContext';
import { labApi } from '@/lib/api';
import LabCard from '@/components/lab/LabCard';
import { FiArrowRight, FiMapPin } from 'react-icons/fi';

function LabSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
      <div className="h-5 bg-gray-100 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
      <div className="h-4 bg-gray-100 rounded w-3/4" />
      <div className="flex gap-2 mt-4">
        <div className="h-6 bg-gray-100 rounded-full w-20" />
        <div className="h-6 bg-gray-100 rounded-full w-16" />
      </div>
    </div>
  );
}

export default function FeaturedLabsSection() {
  const { city, setCity } = useCity();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalInCity, setTotalInCity] = useState(0);

  useEffect(() => {
    setLoading(true);
    const params = { approved: 'true', featured: 'true', limit: 4 };
    if (city) params.city = city;
    labApi.getAll(params)
      .then((res) => {
        setLabs(res.data.items || res.data.labs || []);
        setTotalInCity(res.data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [city]);

  return (
    <section className="py-14 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
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

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => <LabSkeleton key={i} />)}
          </div>
        ) : labs.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {labs.map((lab) => <LabCard key={lab._id} lab={lab} />)}
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
