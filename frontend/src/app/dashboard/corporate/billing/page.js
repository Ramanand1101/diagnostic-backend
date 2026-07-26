'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { corporateApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import { FiDollarSign, FiClock, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`card flex items-center gap-4 ${accent ? `border-l-4 ${accent}` : ''}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-primary-50' : 'bg-gray-100'}`}>
        <Icon className={`text-xl ${accent ? 'text-primary-600' : 'text-gray-500'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function CorporateSelfBillingPage() {
  const { user, loading: authLoading, isCorporate } = useAuth();
  const router = useRouter();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !isCorporate) router.push('/dashboard');
  }, [authLoading, user, isCorporate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBilling = useCallback(async () => {
    if (!isCorporate) return;
    setLoading(true);
    try {
      const mine = await corporateApi.getMine();
      if (!mine.data?._id) { setLoading(false); return; }
      const now = new Date();
      const from = `${now.getFullYear()}-01-01`;
      const to = `${now.getFullYear()}-12-31`;
      const res = await corporateApi.getBilling(mine.data._id, { from, to, groupBy: 'month' });
      setBilling(res.data);
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true);
      else toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isCorporate]);

  useEffect(() => { fetchBilling(); }, [fetchBilling]);

  if (authLoading) return <PageLoader />;
  if (!isCorporate) return null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {loading ? <PageLoader /> : forbidden ? (
        <div className="card p-8 text-center">
          <FiLock className="text-3xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">You don&apos;t have billing access.</p>
          <p className="text-sm text-gray-400 mt-1">Ask your admin to flag your account as HR to view billing.</p>
        </div>
      ) : billing && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard icon={FiDollarSign} label="Total Billed This Year" value={`₹${billing.totalAmount.toLocaleString('en-IN')}`} sub={`${billing.totalCount} appointments`} accent="border-primary-500" />
            <StatCard icon={FiClock} label="Not Yet Invoiced" value={`₹${billing.unbilledAmount.toLocaleString('en-IN')}`} sub={`${billing.unbilledCount} appointments`} accent="border-amber-500" />
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><p className="text-sm font-semibold text-gray-700">Billing by Month</p></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr><th className="table-header">Month</th><th className="table-header">Appointments</th><th className="table-header">Amount</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {(billing.byPeriod || []).map((p) => (
                    <tr key={p._id}><td className="table-cell">{p._id}</td><td className="table-cell">{p.count}</td><td className="table-cell">₹{p.total.toLocaleString('en-IN')}</td></tr>
                  ))}
                  {(billing.byPeriod || []).length === 0 && <tr><td colSpan={3} className="table-cell text-center text-gray-400 py-6">No billing activity this year</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
