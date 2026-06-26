'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { bookingApi } from '@/lib/api';
import { formatDate, formatCurrency, statusColor } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';

export default function BookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingApi.getById(id)
      .then((res) => setBooking(res.data.booking || res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!booking) return <div className="text-center py-20 text-gray-500">Booking not found</div>;

  const statusSteps = ['pending', 'confirmed', 'assigned', 'collected', 'processing', 'completed'];
  const currentStep = statusSteps.indexOf(booking.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/bookings" className="text-sm text-gray-500 hover:text-primary-600">&larr; Back to Bookings</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Booking #{booking.bookingNo}</h1>
        </div>
        <Badge status={booking.status} label={booking.status} />
      </div>

      {/* Progress bar */}
      {!['cancelled', 'refunded'].includes(booking.status) && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Booking Progress</h2>
          <div className="flex items-center gap-1">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className={`flex flex-col items-center gap-1 flex-1 ${i <= currentStep ? 'text-primary-600' : 'text-gray-300'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= currentStep ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</div>
                  <span className="text-xs capitalize hidden sm:block">{step}</span>
                </div>
                {i < statusSteps.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${i < currentStep ? 'bg-primary-600' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Tests Booked</h2>
          <div className="space-y-3">
            {booking.items?.map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-400">Qty: {item.qty}</p>
                </div>
                <p className="text-sm font-semibold">{formatCurrency(item.price)}</p>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 space-y-1">
              {booking.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(booking.discount)}</span>
                </div>
              )}
              {booking.tax > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Tax</span>
                  <span>{formatCurrency(booking.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(booking.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Appointment Details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Date</dt>
                <dd className="font-medium">{formatDate(booking.slotDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Time</dt>
                <dd className="font-medium">{booking.slotTime || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Visit Type</dt>
                <dd className="font-medium capitalize">{booking.visitType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Payment</dt>
                <dd><Badge status={booking.paymentStatus} /></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Method</dt>
                <dd className="font-medium capitalize">{booking.paymentMethod}</dd>
              </div>
            </dl>
          </div>

          {booking.patients?.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">Patient(s)</h2>
              {booking.patients.map((p, i) => (
                <div key={i} className="text-sm text-gray-600">
                  <p className="font-medium">{p.name}</p>
                  <p>{p.age} yrs &bull; {p.gender} &bull; {p.relation}</p>
                </div>
              ))}
            </div>
          )}

          {booking.lab && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-2">Lab</h2>
              <p className="text-sm font-medium">{booking.lab.name}</p>
              {booking.lab.address && <p className="text-xs text-gray-500 mt-1">{booking.lab.address}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
