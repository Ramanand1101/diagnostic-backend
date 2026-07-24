'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { corporateApi } from '@/lib/api';
import { PageLoader } from '@/components/ui/Spinner';
import { FiMail, FiPhone, FiMapPin, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

export default function CorporateOverviewPage() {
  const { user, loading: authLoading, isCorporate } = useAuth();
  const router = useRouter();
  const [corporate, setCorporate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user && !isCorporate) router.push('/dashboard');
  }, [authLoading, user, isCorporate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isCorporate) return;
    corporateApi.getMine().then((r) => setCorporate(r.data)).finally(() => setLoading(false));
  }, [isCorporate]);

  if (authLoading || loading) return <PageLoader />;
  if (!isCorporate) return null;

  if (!corporate) {
    return (
      <div className="card p-8 text-center">
        <FiAlertTriangle className="text-3xl text-amber-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">Your account isn&apos;t linked to a corporate yet.</p>
        <p className="text-sm text-gray-400 mt-1">Please contact HealthOnTime support.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{corporate.companyName}</h1>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${
          corporate.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
        }`}>
          {corporate.active ? <FiCheckCircle size={12} /> : <FiAlertTriangle size={12} />}
          {corporate.active ? 'Active' : 'Suspended'}
        </span>
      </div>

      {!corporate.active && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          This account is currently suspended. You won&apos;t be able to schedule new appointments. Please contact HealthOnTime support.
        </div>
      )}

      <div className="card space-y-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Company Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-700"><FiMail className="text-primary-500 shrink-0" />{corporate.email}</div>
          <div className="flex items-center gap-2 text-gray-700"><FiPhone className="text-primary-500 shrink-0" />{corporate.phone}</div>
          {(corporate.address || corporate.city) && (
            <div className="sm:col-span-2 flex items-start gap-2 text-gray-700">
              <FiMapPin className="text-primary-500 shrink-0 mt-0.5" />
              <span>{[corporate.address, corporate.city, corporate.state, corporate.pincode].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {corporate.gstNumber && <div className="text-xs text-gray-400">GST: {corporate.gstNumber}</div>}
        </div>
      </div>

      <div className="card">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Assigned Labs</p>
        <p className="text-xs text-gray-400 mb-3">You can only schedule appointments at these labs.</p>
        {(corporate.assignedLabs || []).length === 0 ? (
          <p className="text-sm text-gray-400">No labs assigned yet — contact HealthOnTime support.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {corporate.assignedLabs.map((lab) => (
              <div key={lab._id} className="bg-gray-50 rounded-lg px-3 py-2 text-sm">
                <p className="font-medium text-gray-800">{lab.name}</p>
                <p className="text-xs text-gray-400">{[lab.address, lab.city].filter(Boolean).join(', ')}{lab.phone ? ` · ${lab.phone}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Assigned Packages</p>
        {(corporate.packages || []).length === 0 ? (
          <p className="text-sm text-gray-400">No packages assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {corporate.packages.map((p) => (
              <div key={p.package?._id} className="bg-gray-50 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                <span className="font-medium text-gray-800">{p.package?.name}</span>
                <span className="text-primary-600 font-bold">₹{p.price}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
