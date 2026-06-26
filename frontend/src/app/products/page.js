'use client';
import { useState, useEffect, Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/product/ProductCard';
import Pagination from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { productApi, categoryApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { FiFilter, FiX } from 'react-icons/fi';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

function ProductsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    category: searchParams.get('category') || '',
    homeCollection: '',
    fastingRequired: '',
    minPrice: '',
    maxPrice: '',
  });
  const limit = 12;

  useEffect(() => {
    categoryApi.getAll().then((res) => {
      setCategories(res.data.items || res.data.categories || []);
    }).catch(() => {});
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { page, limit, isActive: true };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await productApi.getAll(params);
      setProducts(res.data.items || res.data.products || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [page, filters]);

  const handleFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tests & Packages</h1>
            <p className="text-gray-500 text-sm mt-1">{total} results found</p>
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 btn-secondary text-sm">
            <FiFilter /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={filters.type} onChange={(e) => handleFilter('type', e.target.value)} className="input">
                <option value="">All</option>
                <option value="test">Test</option>
                <option value="package">Package</option>
                <option value="medicine">Medicine</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={filters.category} onChange={(e) => handleFilter('category', e.target.value)} className="input">
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Home Collection</label>
              <select value={filters.homeCollection} onChange={(e) => handleFilter('homeCollection', e.target.value)} className="input">
                <option value="">Any</option>
                <option value="true">Available</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFilters({ type: '', category: '', homeCollection: '', fastingRequired: '', minPrice: '', maxPrice: '' }); setPage(1); }}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
              >
                <FiX /> Clear
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <PageLoader />
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No products found. Try different filters.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
            <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ProductsContent />
    </Suspense>
  );
}
