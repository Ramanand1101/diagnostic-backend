import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LabCard from '@/components/lab/LabCard';
import ProductCard from '@/components/product/ProductCard';
import { FiMapPin, FiChevronRight } from 'react-icons/fi';
import { slugifyCity } from '@/utils/city';
import { getApprovedCities } from '@/lib/cities';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export const revalidate = 60;
export const dynamicParams = true;

function findCityBySlug(cities, citySlug) {
  const target = decodeURIComponent(citySlug || '').toLowerCase();
  return cities.find((c) => slugifyCity(c) === target) || null;
}

export async function generateMetadata({ params }) {
  const cities = await getApprovedCities();
  const city = findCityBySlug(cities, params.city);
  if (!city) return { title: 'City Not Found | HealthOnTime' };
  return {
    title: `Lab Tests & Diagnostic Labs in ${city} | HealthOnTime`,
    description: `Compare and book NABL certified lab tests in ${city}. Home sample collection, digital reports, and the best prices from trusted labs.`,
    openGraph: { title: `Lab Tests in ${city}`, description: `Book diagnostic tests and view top-rated labs in ${city}.`, type: 'website' },
  };
}

export default async function CityPage({ params }) {
  const cities = await getApprovedCities();
  const city = findCityBySlug(cities, params.city);
  if (!city) notFound();

  const cityQuery = encodeURIComponent(city);
  const [labsRes, productsRes] = await Promise.all([
    fetch(`${API}/labs?city=${cityQuery}&approved=true&limit=8&sort=-ratingAvg`, { next: { revalidate: 60 } }),
    fetch(`${API}/products?city=${cityQuery}&isActive=true&limit=10`, { next: { revalidate: 60 } }),
  ]);
  const labs = labsRes.ok ? (await labsRes.json()).items || [] : [];
  const products = productsRes.ok ? (await productsRes.json()).items || [] : [];
  const otherCities = cities.filter((c) => c !== city);

  return (
    <>
      <Navbar />
      <main>
        {/* Hero banner */}
        <section className="bg-gradient-to-br from-primary-700 to-primary-900 py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
            <div className="flex items-center gap-1.5 text-primary-200 text-sm mb-4">
              <Link href="/" className="hover:text-white">Home</Link>
              <FiChevronRight className="text-xs" />
              <span className="text-white font-medium">{city}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center gap-2">
              <FiMapPin className="text-primary-300" /> Lab Tests & Diagnostic Labs in {city}
            </h1>
            <p className="text-primary-200 max-w-2xl mb-7">
              Compare prices from NABL certified labs in {city}, book online in minutes, and get home sample collection with secure digital reports.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={`/products?city=${cityQuery}&type=test`} className="bg-white text-primary-700 font-semibold px-7 py-3 rounded-xl hover:bg-primary-50 transition-colors shadow-lg">
                Book a Test in {city}
              </Link>
              <Link href={`/labs?city=${cityQuery}`} className="border-2 border-white/40 text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/10 transition-colors">
                View All Labs in {city}
              </Link>
            </div>
          </div>
        </section>

        {/* Top labs */}
        <section className="py-14 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-7">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Top Labs in {city}</h2>
                <p className="text-sm text-gray-500 mt-1">NABL certified labs serving {city}</p>
              </div>
              <Link href={`/labs?city=${cityQuery}`} className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 shrink-0">
                View all <FiChevronRight className="text-sm" />
              </Link>
            </div>

            {labs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
                {labs.map((lab) => <LabCard key={lab._id} lab={lab} />)}
              </div>
            ) : (
              <div className="text-center py-14 text-gray-400">
                <FiMapPin className="text-4xl mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-500">No labs listed in {city} yet</p>
                <Link href="/labs" className="mt-3 inline-block text-sm text-primary-600 hover:underline">Browse all labs</Link>
              </div>
            )}
          </div>
        </section>

        {/* Popular tests */}
        <section className="py-14 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-7">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Popular Tests in {city}</h2>
                <p className="text-sm text-gray-500 mt-1">Handpicked tests available from labs in {city}</p>
              </div>
              <Link href={`/products?city=${cityQuery}`} className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 shrink-0">
                View all <FiChevronRight className="text-sm" />
              </Link>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
                {products.map((p) => <ProductCard key={p._id} product={p} />)}
              </div>
            ) : (
              <div className="text-center py-14 text-gray-400">
                <p className="font-medium text-gray-500">No tests available in {city} yet</p>
                <Link href="/products" className="mt-3 inline-block text-sm text-primary-600 hover:underline">Browse all tests</Link>
              </div>
            )}
          </div>
        </section>

        {/* Other cities */}
        {otherCities.length > 0 && (
          <section className="py-12 bg-[#F8FAFC] border-t border-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Book Lab Tests in Other Cities</h2>
              <div className="flex flex-wrap gap-x-1 gap-y-2 text-sm text-gray-500">
                {otherCities.map((c, i) => (
                  <span key={c}>
                    <Link href={`/city/${slugifyCity(c)}`} className="hover:text-primary-600 hover:underline">{c}</Link>
                    {i < otherCities.length - 1 && <span className="mx-1.5 text-gray-300">|</span>}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
