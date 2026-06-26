'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LabCard from '@/components/lab/LabCard';
import Pagination from '@/components/ui/Pagination';
import { PageLoader } from '@/components/ui/Spinner';
import { labApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { FiFilter, FiX, FiGitMerge } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function LabsPage() {
  const router = useRouter();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ city: '', homeCollection: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const limit = 12;

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const params = { page, limit, approved: true };
      if (filters.city) params.city = filters.city;
      if (filters.homeCollection) params.homeCollection = filters.homeCollection;
      const res = await labApi.getAll(params);
      setLabs(res.data.items || res.data.labs || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLabs(); }, [page, filters]);

  const handleFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) { toast.error('You can compare up to 3 labs'); return prev; }
      return [...prev, id];
    });
  };

  const handleCompare = () => {
    if (compareIds.length < 2) { toast.error('Select at least 2 labs to compare'); return; }
    router.push(`/labs/compare?ids=${compareIds.join(',')}`);
  };

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Diagnostic Labs</h1>
            <p className="text-gray-500 text-sm mt-1">{total} labs available</p>
          </div>
          <div className="flex items-center gap-3">
            {compareIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{compareIds.length} selected</span>
                <button onClick={handleCompare} className="btn-primary text-sm flex items-center gap-2">
                  <FiGitMerge /> Compare
                </button>
                <button onClick={() => setCompareIds([])} className="text-sm text-gray-400 hover:text-gray-600">
                  <FiX />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 btn-secondary text-sm"
            >
              <FiFilter /> Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => handleFilter('city', e.target.value)}
                className="input"
                placeholder="e.g. Mumbai"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Home Collection</label>
              <select
                value={filters.homeCollection}
                onChange={(e) => handleFilter('homeCollection', e.target.value)}
                className="input"
              >
                <option value="">All</option>
                <option value="true">Available</option>
                <option value="false">Not Available</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFilters({ city: '', homeCollection: '' }); setPage(1); }}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700"
              >
                <FiX /> Clear Filters
              </button>
            </div>
          </div>
        )}

        {compareIds.length > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3 mb-6 text-sm text-primary-700 flex items-center justify-between">
            <span>{compareIds.length} lab{compareIds.length > 1 ? 's' : ''} selected for comparison (max 3)</span>
            <button onClick={handleCompare} className="font-medium underline">Compare Now</button>
          </div>
        )}

        {loading ? (
          <PageLoader />
        ) : labs.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No labs found. Try different filters.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {labs.map((lab) => (
                <LabCard
                  key={lab._id}
                  lab={lab}
                  compareIds={compareIds}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>
            <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
