'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCity } from '@/context/CityContext';
import { productApi } from '@/lib/api';
import ProductCard from '@/components/product/ProductCard';
import { FiArrowRight, FiPackage } from 'react-icons/fi';

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
      <div className="h-1.5 bg-gray-100 rounded w-full -mt-5 -mx-5 mb-4" style={{ marginTop: '-20px', marginLeft: '-20px', width: 'calc(100% + 40px)' }} />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="h-5 bg-gray-100 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
      <div className="flex gap-2 mt-2">
        <div className="h-6 bg-gray-100 rounded-full w-16" />
        <div className="h-6 bg-gray-100 rounded-full w-20" />
      </div>
      <div className="h-8 bg-gray-100 rounded-lg w-full mt-auto" />
    </div>
  );
}

export default function FeaturedProductsSection() {
  const { city, setCity } = useCity();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    const base = { isActive: 'true', limit: 8 };
    if (city) base.city = city;

    productApi.getAll({ ...base, isFeatured: 'true' })
      .then((res) => {
        const items = res.data.items || [];
        if (items.length > 0) {
          setProducts(items);
          setTotal(res.data.total || 0);
          return;
        }
        // No featured products in this city — fallback to any active products
        return productApi.getAll(base).then((r2) => {
          setProducts(r2.data.items || []);
          setTotal(r2.data.total || 0);
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [city]);

  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-7">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {city ? `Tests & Packages in ${city}` : 'Tests & Packages'}
              </h2>
              {city && total > 8 && (
                <span className="text-xs bg-secondary-100 text-secondary-700 font-semibold px-2 py-0.5 rounded-full">
                  {total}+ tests
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">
                {city
                  ? `Affordable, accurate tests available from labs in ${city}`
                  : 'Affordable, accurate, and NABL-certified'}
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
            href={city ? `/products?city=${encodeURIComponent(city)}` : '/products'}
            className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 group shrink-0"
          >
            View all tests <FiArrowRight className="text-sm group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        ) : (
          <div className="text-center py-14 text-gray-400">
            <FiPackage className="text-4xl mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-500">
              No tests found{city ? ` in ${city}` : ''}
            </p>
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
