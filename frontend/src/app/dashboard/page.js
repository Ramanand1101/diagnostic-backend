'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { bookingApi, labApi, productApi, labCrmApi } from '@/lib/api';
import { formatDate, formatCurrency, statusColor } from '@/utils/helpers';
import {
  FiCalendar, FiFileText, FiClock, FiCheckCircle,
  FiMapPin, FiPackage, FiUsers, FiAlertCircle,
  FiArrowRight, FiEdit, FiActivity,
} from 'react-icons/fi';

// ── Lab Dashboard Overview ────────────────────────────────────────────────────

function LabDashboard({ user }) {
  const [lab, setLab] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [productCount, setProductCount] = useState(0);
  const [crmStats, setCrmStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      labApi.getMine(),
      bookingApi.getAll({ limit: 5 }),
      productApi.getAll({ limit: 1 }),
      labCrmApi.stats(),
    ]).then(([labRes, bookRes, prodRes, crmRes]) => {
      if (labRes.status === 'fulfilled') setLab(labRes.value.data);
      if (bookRes.status === 'fulfilled') setBookings(bookRes.value.data.items || []);
      if (prodRes.status === 'fulfilled') setProductCount(prodRes.value.data.total || 0);
      if (crmRes.status === 'fulfilled') setCrmStats(crmRes.value.data);
      setLoading(false);
    });
  }, []);

  const pending = bookings.filter((b) => b.status === 'pending').length;
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
  const completed = bookings.filter((b) => b.status === 'completed').length;

  const quickActions = [
    { href: '/dashboard/lab', label: 'Edit Lab Profile', icon: FiEdit, color: 'bg-primary-50 text-primary-600 hover:bg-primary-100' },
    { href: '/dashboard/lab/products', label: 'Manage Tests', icon: FiPackage, color: 'bg-secondary-50 text-secondary-700 hover:bg-secondary-100' },
    { href: '/dashboard/lab/bookings', label: 'View Bookings', icon: FiCalendar, color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
    { href: '/dashboard/lab/crm', label: 'CRM Dashboard', icon: FiActivity, color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-gray-500 text-sm mt-1">Lab Management Dashboard</p>
        </div>
        {lab && (
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            lab.approved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {lab.approved ? <FiCheckCircle /> : <FiAlertCircle />}
            {lab.approved ? 'Lab Approved & Live' : 'Pending Admin Approval'}
          </span>
        )}
      </div>

      {/* Lab not created yet */}
      {!loading && !lab && (
        <div className="card border-dashed border-2 border-primary-200 text-center py-10">
          <FiMapPin className="text-4xl text-primary-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-800 mb-1">Set Up Your Lab</h3>
          <p className="text-sm text-gray-500 mb-4">Add your lab details to start receiving bookings.</p>
          <Link href="/dashboard/lab" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors">
            <FiEdit /> Create Lab Profile
          </Link>
        </div>
      )}

      {/* Stats */}
      {lab && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Tests Listed', value: productCount, icon: FiPackage, color: 'bg-primary-50 text-primary-600' },
              { label: 'Pending Bookings', value: pending, icon: FiClock, color: 'bg-yellow-50 text-yellow-600' },
              { label: 'Confirmed', value: confirmed, icon: FiCheckCircle, color: 'bg-blue-50 text-blue-600' },
              { label: 'Total Patients', value: crmStats?.totalPatients ?? '—', icon: FiUsers, color: 'bg-secondary-50 text-secondary-600' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className="text-lg" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{loading ? '…' : value}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wider">Quick Actions</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href}
                  className={`flex flex-col items-center gap-2 p-5 rounded-2xl border border-gray-100 text-center text-sm font-medium transition-colors ${color}`}>
                  <Icon className="text-xl" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Lab summary card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Lab Info</h2>
              <Link href="/dashboard/lab" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                Edit <FiArrowRight className="text-xs" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Lab Name</p>
                <p className="font-medium text-gray-800">{lab.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">City</p>
                <p className="font-medium text-gray-800">{lab.city || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Home Collection</p>
                <p className={`font-medium ${lab.homeCollection ? 'text-green-600' : 'text-gray-400'}`}>
                  {lab.homeCollection ? '✓ Available' : 'Not offered'}
                </p>
              </div>
            </div>
          </div>

          {/* Recent bookings */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
              <Link href="/dashboard/lab/bookings" className="text-sm text-primary-600 hover:underline">View all</Link>
            </div>
            {loading ? (
              <div className="text-center py-6 text-gray-400 text-sm">Loading…</div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8">
                <FiCalendar className="text-3xl text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{b.bookingNo}</p>
                      <p className="text-xs text-gray-500">{formatDate(b.slotDate)} · {b.items?.length} test(s)</p>
                    </div>
                    <div className="text-right">
                      <span className={`badge text-xs ${statusColor(b.status)}`}>{b.status}</span>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(b.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Customer Dashboard Overview ───────────────────────────────────────────────

function CustomerDashboard({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingApi.getAll({ limit: 5 })
      .then((res) => setBookings(res.data.items || res.data.bookings || []))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Total Bookings', value: bookings.length, icon: FiCalendar, color: 'bg-primary-50 text-primary-600' },
    { label: 'Completed', value: bookings.filter((b) => b.status === 'completed').length, icon: FiCheckCircle, color: 'bg-secondary-50 text-secondary-600' },
    { label: 'Pending', value: bookings.filter((b) => b.status === 'pending').length, icon: FiClock, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Reports', value: bookings.filter((b) => b.status === 'completed').length, icon: FiFileText, color: 'bg-accent-50 text-accent-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-gray-500 text-sm mt-1">Here&apos;s an overview of your health journey</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className="text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
          <Link href="/dashboard/bookings" className="text-sm text-primary-600 hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="text-center py-6 text-gray-400 text-sm">Loading...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-10">
            <FiCalendar className="text-3xl text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No bookings yet</p>
            <Link href="/products" className="btn-primary text-sm mt-3 inline-block">Book a Test</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Link key={booking._id} href={`/dashboard/bookings/${booking._id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">#{booking.bookingNo}</p>
                  <p className="text-xs text-gray-500">{formatDate(booking.slotDate)} &bull; {booking.items?.length} item(s)</p>
                </div>
                <div className="text-right">
                  <span className={`badge text-xs ${statusColor(booking.status)}`}>{booking.status}</span>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(booking.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === 'lab' ? <LabDashboard user={user} /> : <CustomerDashboard user={user} />;
}
