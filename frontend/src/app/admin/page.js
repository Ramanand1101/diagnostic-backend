'use client';
import { useState, useEffect } from 'react';
import { dashboardApi } from '@/lib/api';
import { formatCurrency } from '@/utils/helpers';
import { FiUsers, FiMapPin, FiCalendar, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';
import { PageLoader } from '@/components/ui/Spinner';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then((res) => setStats(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const cards = [
    { label: 'Total Users', value: stats?.users ?? '-', icon: FiUsers, color: 'bg-primary-50 text-primary-600', href: '/admin/users' },
    { label: 'Labs', value: stats?.labs ?? '-', icon: FiMapPin, color: 'bg-secondary-50 text-secondary-600', href: '/admin/labs' },
    { label: 'Bookings', value: stats?.bookings ?? '-', icon: FiCalendar, color: 'bg-primary-50 text-primary-600', href: '/admin/bookings' },
    { label: 'Revenue', value: formatCurrency(stats?.revenue), icon: FiTrendingUp, color: 'bg-secondary-50 text-secondary-600', href: '/admin/bookings' },
    { label: 'Pending Labs', value: stats?.pendingLabs ?? '-', icon: FiAlertCircle, color: 'bg-accent-50 text-accent-600', href: '/admin/labs' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome to the admin panel</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href} className="card hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className="text-lg" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'Approve Pending Labs', href: '/admin/labs' },
              { label: 'View New Bookings', href: '/admin/bookings' },
              { label: 'Manage Coupons', href: '/admin/coupons' },
              { label: 'Reindex Search', href: '/admin/settings' },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block text-sm text-primary-600 hover:underline">{label}</Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Content</h3>
          <div className="space-y-2">
            {[
              { label: 'Write a Blog', href: '/admin/blogs' },
              { label: 'Create CMS Page', href: '/admin/pages' },
              { label: 'Newsletter Subscribers', href: '/admin/newsletter' },
              { label: 'Support Tickets', href: '/admin/tickets' },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block text-sm text-primary-600 hover:underline">{label}</Link>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Catalog</h3>
          <div className="space-y-2">
            {[
              { label: 'Add New Product', href: '/admin/products' },
              { label: 'Add Category', href: '/admin/categories' },
              { label: 'Manage Reports', href: '/admin/reports' },
              { label: 'User Reviews', href: '/admin/reviews' },
            ].map(({ label, href }) => (
              <Link key={label} href={href} className="block text-sm text-primary-600 hover:underline">{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
