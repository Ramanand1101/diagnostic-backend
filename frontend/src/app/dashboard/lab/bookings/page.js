'use client';
import { useState, useEffect, useRef } from 'react';
import { bookingApi, reportApi } from '@/lib/api';
import { formatDate, formatCurrency, statusColor, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import { FiCalendar, FiMapPin, FiHome, FiUser, FiClock, FiCheckCircle, FiUpload, FiFileText } from 'react-icons/fi';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'collected', label: 'Collected' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const NEXT_ACTIONS = {
  pending:    [{ label: 'Confirm',          status: 'confirmed',  style: 'primary' }],
  confirmed:  [{ label: 'Mark Assigned',    status: 'assigned',   style: 'secondary' }],
  assigned:   [{ label: 'Mark Collected',   status: 'collected',  style: 'secondary' }],
  collected:  [{ label: 'Mark Processing',  status: 'processing', style: 'secondary' }],
  processing: [{ label: 'Mark Completed',   status: 'completed',  style: 'success' }],
};

const CANCEL_ALLOWED = ['pending', 'confirmed', 'assigned'];

export default function LabBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [updating, setUpdating] = useState(null);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [uploadedBookings, setUploadedBookings] = useState({});
  const fileInputRef = useRef(null);
  const pendingUploadBookingId = useRef(null);

  const fetchBookings = async (status = '') => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (status) params.status = status;
      const res = await bookingApi.getAll(params);
      setBookings(res.data.items || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(activeTab); }, [activeTab]);

  const updateStatus = async (bookingId, status) => {
    setUpdating(bookingId + status);
    try {
      const res = await bookingApi.updateStatus(bookingId, { status });
      setBookings((prev) =>
        prev.map((b) => b._id === bookingId ? { ...b, status: res.data.status } : b)
      );
      toast.success(`Booking ${status}!`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  const triggerUpload = (bookingId) => {
    pendingUploadBookingId.current = bookingId;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    const bookingId = pendingUploadBookingId.current;
    e.target.value = '';
    if (!files.length || !bookingId) return;

    const invalid = files.find((f) => f.type !== 'application/pdf');
    if (invalid) {
      toast.error(`"${invalid.name}" is not a PDF`);
      return;
    }

    setUploadingFor(bookingId);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('booking', bookingId);
      await reportApi.upload(formData);
      setUploadedBookings((prev) => ({
        ...prev,
        [bookingId]: (prev[bookingId] || 0) + files.length,
      }));
      toast.success(`${files.length} report${files.length > 1 ? 's' : ''} uploaded! Superadmin notified.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingFor(null);
    }
  };

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-accent-600 font-medium mt-0.5">
              {pendingCount} booking{pendingCount > 1 ? 's' : ''} waiting for confirmation
            </p>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activeTab === key
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Booking list */}
      {loading ? (
        <PageLoader />
      ) : bookings.length === 0 ? (
        <div className="card text-center py-16">
          <FiCalendar className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab ? `No ${activeTab} bookings` : 'Bookings will appear here when customers book your tests'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const actions = NEXT_ACTIONS[b.status] || [];
            const canCancel = CANCEL_ALLOWED.includes(b.status);
            const isUpdating = (s) => updating === b._id + s;
            const isCompleted = b.status === 'completed';
            const reportUploaded = uploadedBookings[b._id];
            const isUploadingThis = uploadingFor === b._id;

            return (
              <div key={b._id} className={`card space-y-4 ${b.status === 'pending' ? 'border-l-4 border-l-yellow-400' : ''}`}>
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">#{b.bookingNo}</span>
                      <span className={`badge text-xs capitalize ${statusColor(b.status)}`}>
                        {b.status}
                      </span>
                      {b.visitType === 'home' && (
                        <span className="badge bg-secondary-50 text-secondary-700 text-xs flex items-center gap-1">
                          <FiHome className="text-xs" /> Home Visit
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Booked on {formatDate(b.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600 text-lg">{formatCurrency(b.total)}</p>
                    <p className={`text-xs font-medium ${b.paymentStatus === 'paid' ? 'text-green-600' : 'text-accent-500'}`}>
                      {b.paymentStatus === 'paid' ? '✓ Paid' : 'Unpaid'}
                    </p>
                  </div>
                </div>

                {/* Tests */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  {b.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.name || item.product?.name}</span>
                      <span className="text-gray-500">{formatCurrency(item.price)} × {item.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Details row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {b.patients?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <FiUser className="text-primary-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Patient</p>
                        {b.patients.map((p, i) => (
                          <p key={i} className="text-gray-700 text-xs font-medium">
                            {p.name}{p.age ? `, ${p.age} yrs` : ''}{p.gender ? ` (${p.gender})` : ''}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {b.slotDate && (
                    <div className="flex items-start gap-2">
                      <FiClock className="text-primary-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Slot</p>
                        <p className="text-gray-700 text-xs font-medium">
                          {formatDate(b.slotDate)}{b.slotTime ? ` · ${b.slotTime}` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {b.visitType === 'home' && b.address && (
                    <div className="flex items-start gap-2">
                      <FiMapPin className="text-primary-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">Pickup Address</p>
                        <p className="text-gray-700 text-xs">{b.address}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer */}
                {b.user && (
                  <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
                    Customer: <span className="font-medium text-gray-700">{b.user.name}</span>
                    {b.user.mobile && <span> · {b.user.mobile}</span>}
                    {b.user.email && <span> · {b.user.email}</span>}
                  </div>
                )}

                {/* Action buttons */}
                {(actions.length > 0 || canCancel || isCompleted) && (
                  <div className="flex gap-2 flex-wrap pt-1 border-t border-gray-100">
                    {actions.map(({ label, status, style }) => (
                      <button
                        key={status}
                        onClick={() => updateStatus(b._id, status)}
                        disabled={!!updating}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
                          style === 'primary'   ? 'bg-primary-600 text-white hover:bg-primary-700' :
                          style === 'success'   ? 'bg-green-600 text-white hover:bg-green-700' :
                                                  'bg-secondary-500 text-white hover:bg-secondary-600'
                        }`}
                      >
                        {isUpdating(status) ? <Spinner size="sm" /> : <FiCheckCircle className="text-sm" />}
                        {label}
                      </button>
                    ))}

                    {canCancel && (
                      <button
                        onClick={() => updateStatus(b._id, 'cancelled')}
                        disabled={!!updating}
                        className="px-4 py-2 rounded-lg text-sm font-medium border border-accent-200 text-accent-600 hover:bg-accent-50 transition-colors disabled:opacity-60"
                      >
                        {isUpdating('cancelled') ? <Spinner size="sm" /> : 'Cancel Booking'}
                      </button>
                    )}

                    {/* Upload Report — available for completed bookings */}
                    {isCompleted && (
                      <>
                        {reportUploaded > 0 && (
                          <span className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                            <FiFileText className="text-sm" />
                            {reportUploaded} Report{reportUploaded > 1 ? 's' : ''} Uploaded
                          </span>
                        )}
                        <button
                          onClick={() => triggerUpload(b._id)}
                          disabled={!!uploadingFor}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors disabled:opacity-60"
                        >
                          {isUploadingThis ? <Spinner size="sm" /> : <FiUpload className="text-sm" />}
                          {isUploadingThis ? 'Uploading...' : reportUploaded ? 'Upload More PDFs' : 'Upload Report (PDF)'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
