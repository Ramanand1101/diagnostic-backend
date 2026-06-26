'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { bookingApi } from '@/lib/api';
import { formatDate, formatCurrency, statusColor } from '@/utils/helpers';
import { FiCalendar, FiFileText, FiClock, FiCheckCircle } from 'react-icons/fi';

export default function DashboardPage() {
  const { user } = useAuth();
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

      {/* Stats */}
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

      {/* Recent Bookings */}
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
              <Link
                key={booking._id}
                href={`/dashboard/bookings/${booking._id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
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
