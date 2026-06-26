'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import { PageLoader } from '@/components/ui/Spinner';
import { labApi, productApi, reviewApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { FiMapPin, FiPhone, FiMail, FiGlobe, FiStar, FiClock, FiHome, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function LabDetailPage() {
  const { slug } = useParams();
  const [lab, setLab] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tests');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const labRes = await labApi.getBySlug(slug);
        const labData = labRes.data.lab || labRes.data;
        setLab(labData);
        const [prodRes, revRes] = await Promise.all([
          productApi.getAll({ lab: labData._id, limit: 20 }),
          reviewApi.getAll({ lab: labData._id }),
        ]);
        setProducts(prodRes.data.items || prodRes.data.products || []);
        setReviews(revRes.data.items || revRes.data.reviews || []);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  if (loading) return <><Navbar /><PageLoader /><Footer /></>;
  if (!lab) return <><Navbar /><div className="text-center py-20">Lab not found</div><Footer /></>;

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <div className="bg-gradient-to-r from-gray-900 to-primary-700 text-white py-10 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold">{lab.name}</h1>
                  {lab.verificationStatus === 'verified' && (
                    <FiCheckCircle className="text-secondary-300 text-xl" title="Verified" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-primary-100 text-sm">
                  <FiMapPin /> {lab.address}{lab.city ? `, ${lab.city}` : ''}
                </div>
                {lab.ratingAvg > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-yellow-300">
                    <FiStar className="fill-yellow-300" />
                    <span className="font-semibold">{lab.ratingAvg.toFixed(1)}</span>
                    <span className="text-primary-200 text-sm">({lab.reviewCount} reviews)</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {lab.homeCollection && <span className="badge bg-secondary-500/30 text-white"><FiHome className="mr-1" />Home Collection</span>}
                {lab.accreditation?.map((a) => <span key={a} className="badge bg-white/20 text-white">{a}</span>)}
                {lab.featured && <span className="badge bg-yellow-400/80 text-yellow-900">Featured</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Info card */}
            <div className="lg:col-span-1">
              <div className="card space-y-4">
                <h3 className="font-semibold text-gray-900">Lab Information</h3>
                {lab.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiPhone className="text-primary-500 flex-shrink-0" />
                    <a href={`tel:${lab.phone}`} className="hover:text-primary-600">{lab.phone}</a>
                  </div>
                )}
                {lab.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiMail className="text-primary-500 flex-shrink-0" />
                    <a href={`mailto:${lab.email}`} className="hover:text-primary-600">{lab.email}</a>
                  </div>
                )}
                {lab.website && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiGlobe className="text-primary-500 flex-shrink-0" />
                    <a href={lab.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 truncate">{lab.website}</a>
                  </div>
                )}
                {lab.openingHours && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FiClock className="text-primary-500 flex-shrink-0" />
                    <span>{lab.openingHours}</span>
                  </div>
                )}
                {lab.reportDeliveryTime && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Report Delivery</p>
                    <p className="text-sm font-medium">{lab.reportDeliveryTime}</p>
                  </div>
                )}
                {lab.sampleCollectionTime && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Sample Collection</p>
                    <p className="text-sm font-medium">{lab.sampleCollectionTime}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: tabs */}
            <div className="lg:col-span-2">
              {lab.description && (
                <div className="card mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">About</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{lab.description}</p>
                </div>
              )}

              {/* Tab switcher */}
              <div className="flex gap-2 mb-4">
                {['tests', 'reviews'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      tab === t ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t === 'tests' ? `Tests & Packages (${products.length})` : `Reviews (${reviews.length})`}
                  </button>
                ))}
              </div>

              {tab === 'tests' && (
                products.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">No tests listed for this lab.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map((p) => <ProductCard key={p._id} product={p} />)}
                  </div>
                )
              )}

              {tab === 'reviews' && (
                reviews.length === 0 ? (
                  <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-100">No reviews yet.</div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r) => (
                      <div key={r._id} className="card">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold text-sm">
                            {r.user?.name?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{r.user?.name || 'Anonymous'}</p>
                            <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-1 text-yellow-400">
                            {Array.from({ length: r.rating }).map((_, i) => <FiStar key={i} className="fill-yellow-400" />)}
                          </div>
                        </div>
                        {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
