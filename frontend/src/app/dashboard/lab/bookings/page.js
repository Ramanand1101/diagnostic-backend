'use client';
import { useState, useEffect, useRef } from 'react';
import { bookingApi, reportApi } from '@/lib/api';
import { formatDate, formatCurrency, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Spinner from '@/components/ui/Spinner';
import toast from 'react-hot-toast';
import {
  FiCalendar, FiMapPin, FiHome, FiUser, FiClock,
  FiUpload, FiFileText, FiUserCheck, FiPackage, FiCpu, FiCheckCircle,
} from 'react-icons/fi';

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

// Journey stages shown in the stepper (confirmed is always first, it's the starting state)
const JOURNEY = [
  { key: 'confirmed',  label: 'Confirmed',  shortLabel: 'Confirmed' },
  { key: 'assigned',   label: 'Assigned',   shortLabel: 'Assign'    },
  { key: 'collected',  label: 'Collected',  shortLabel: 'Collect'   },
  { key: 'processing', label: 'Processing', shortLabel: 'Process'   },
  { key: 'completed',  label: 'Completed',  shortLabel: 'Complete'  },
];

// Each action button config: what status it transitions TO, from which status
const JOURNEY_ACTIONS = [
  { label: 'Mark Assigned',    icon: FiUserCheck,    nextStatus: 'assigned',   fromStatus: 'confirmed',  color: 'blue'   },
  { label: 'Mark Collected',   icon: FiPackage,      nextStatus: 'collected',  fromStatus: 'assigned',   color: 'purple' },
  { label: 'Mark Processing',  icon: FiCpu,          nextStatus: 'processing', fromStatus: 'collected',  color: 'orange' },
  { label: 'Mark Completed',   icon: FiCheckCircle,  nextStatus: 'completed',  fromStatus: 'processing', color: 'teal'   },
];

const JOURNEY_IDX = Object.fromEntries(JOURNEY.map((s, i) => [s.key, i]));

const CANCEL_ALLOWED = ['pending', 'confirmed', 'assigned'];

const actionColorClass = {
  blue:   'bg-blue-600 text-white hover:bg-blue-700',
  purple: 'bg-purple-600 text-white hover:bg-purple-700',
  orange: 'bg-orange-500 text-white hover:bg-orange-600',
  teal:   'bg-teal-600 text-white hover:bg-teal-700',
};

function JourneyStepper({ status }) {
  const currentIdx = JOURNEY_IDX[status] ?? -1;
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-lg border border-red-100 inline-flex">
        Booking Cancelled
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {JOURNEY.map((stage, i) => {
        const isDone    = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={stage.key} className="flex items-center">
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              isDone && isCurrent ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300' :
              isDone              ? 'bg-green-100 text-green-700' :
                                    'bg-gray-100 text-gray-400'
            }`}>
              <span className="font-bold">{isDone && !isCurrent ? '✓' : i + 1}</span>
              <span>{stage.shortLabel}</span>
            </div>
            {i < JOURNEY.length - 1 && (
              <div className={`w-4 h-0.5 flex-shrink-0 ${i < currentIdx ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

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
      toast.success(`Status updated to ${status}`);
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
    if (invalid) { toast.error(`"${invalid.name}" is not a PDF`); return; }

    setUploadingFor(bookingId);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('booking', bookingId);
      await reportApi.upload(formData);
      setUploadedBookings((prev) => ({ ...prev, [bookingId]: (prev[bookingId] || 0) + files.length }));
      toast.success(`${files.length} report${files.length > 1 ? 's' : ''} uploaded!`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingFor(null);
    }
  };

  const pendingCount = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="space-y-6">
      <input ref={fileInputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={handleFileSelected} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-accent-600 font-medium mt-0.5">
              {pendingCount} booking{pendingCount > 1 ? 's' : ''} awaiting action
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
            const currentIdx      = JOURNEY_IDX[b.status] ?? -1;
            const isCancelled     = b.status === 'cancelled';
            const isPending       = b.status === 'pending';
            const canCancel       = CANCEL_ALLOWED.includes(b.status);
            const reportUploaded  = uploadedBookings[b._id];
            const isUploadingThis = uploadingFor === b._id;

            return (
              <div
                key={b._id}
                className={`card space-y-4 ${
                  isPending     ? 'border-l-4 border-l-yellow-400' :
                  isCancelled   ? 'opacity-75' : ''
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">#{b.bookingNo}</span>
                      {b.visitType === 'home' && (
                        <span className="badge bg-secondary-50 text-secondary-700 text-xs flex items-center gap-1">
                          <FiHome className="text-xs" /> Home Visit
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">Booked on {formatDate(b.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600 text-lg">{formatCurrency(b.total)}</p>
                    <p className={`text-xs font-medium ${b.paymentStatus === 'paid' ? 'text-green-600' : 'text-accent-500'}`}>
                      {b.paymentStatus === 'paid' ? '✓ Paid' : 'Unpaid'}
                    </p>
                  </div>
                </div>

                {/* Journey stepper */}
                <JourneyStepper status={b.status} />

                {/* Tests */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  {b.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{item.name || item.product?.name}</span>
                      <span className="text-gray-500">{formatCurrency(item.price)} × {item.qty}</span>
                    </div>
                  ))}
                </div>

                {/* Details */}
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

                {/* ── Journey Action Buttons ── */}
                {!isCancelled && (
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    {/* Confirm if pending */}
                    {isPending && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => updateStatus(b._id, 'confirmed')}
                          disabled={!!updating}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
                        >
                          {updating === b._id + 'confirmed' ? <Spinner size="sm" /> : <FiCheckCircle />}
                          Confirm Booking
                        </button>
                        <button
                          onClick={() => updateStatus(b._id, 'cancelled')}
                          disabled={!!updating}
                          className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Journey step buttons (shown for non-pending, non-cancelled) */}
                    {!isPending && (
                      <div className="flex flex-wrap gap-2">
                        {JOURNEY_ACTIONS.map(({ label, icon: Icon, nextStatus, fromStatus, color }) => {
                          const nextIdx  = JOURNEY_IDX[nextStatus] ?? 99;
                          const isDone   = nextIdx <= currentIdx;
                          const isNext   = b.status === fromStatus;
                          const isFuture = nextIdx > currentIdx + 1;

                          return (
                            <button
                              key={nextStatus}
                              disabled={!isNext || !!updating}
                              onClick={() => isNext && updateStatus(b._id, nextStatus)}
                              title={isFuture ? 'Complete previous steps first' : undefined}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                isDone
                                  ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
                                  : isNext
                                    ? `${actionColorClass[color]} shadow-sm`
                                    : 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed'
                              }`}
                            >
                              {isDone ? (
                                <><FiCheckCircle className="text-green-600" />{label.replace('Mark ', '')} ✓</>
                              ) : updating === b._id + nextStatus ? (
                                <><Spinner size="sm" />{label}</>
                              ) : (
                                <><Icon />{label}</>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Upload Report — always a separate distinct button */}
                    {!isPending && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <button
                          onClick={() => triggerUpload(b._id)}
                          disabled={!!uploadingFor}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-60 transition-colors"
                        >
                          {isUploadingThis ? <Spinner size="sm" /> : <FiUpload className="text-sm" />}
                          {isUploadingThis ? 'Uploading…' : reportUploaded ? `Upload More PDFs` : 'Upload Report PDF'}
                        </button>

                        {reportUploaded > 0 && (
                          <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            <FiFileText />
                            {reportUploaded} Report{reportUploaded > 1 ? 's' : ''} Uploaded
                          </span>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => updateStatus(b._id, 'cancelled')}
                            disabled={!!updating}
                            className="ml-auto text-xs text-red-400 hover:text-red-600 font-medium transition-colors disabled:opacity-60"
                          >
                            {updating === b._id + 'cancelled' ? 'Cancelling…' : 'Cancel Booking'}
                          </button>
                        )}
                      </div>
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
