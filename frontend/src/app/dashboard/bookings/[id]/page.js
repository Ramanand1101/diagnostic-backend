'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { bookingApi, reportApi, reportNoteApi } from '@/lib/api';
import { formatDate, formatCurrency, statusColor, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { FiFileText, FiEye, FiDownload, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';

// ── Customer's private notes for one report — never touches the report file itself ──
function ReportNotes({ reportId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');

  const fetchNotes = () => {
    setLoading(true);
    reportNoteApi.getAll(reportId).then((res) => setNotes(res.data.items || [])).finally(() => setLoading(false));
  };
  useEffect(() => { fetchNotes(); }, [reportId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await reportNoteApi.create(reportId, draft.trim());
      setDraft('');
      fetchNotes();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleSaveEdit = async (id) => {
    if (!editDraft.trim()) return;
    try {
      await reportNoteApi.update(id, editDraft.trim());
      setEditingId(null);
      fetchNotes();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this note?')) return;
    try {
      await reportNoteApi.remove(id);
      fetchNotes();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="mt-2 pl-3 border-l-2 border-gray-100 space-y-2">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">My Notes (private)</p>
      {loading ? <p className="text-xs text-gray-400">Loading…</p> : (
        <div className="space-y-1.5">
          {notes.map((n) => (
            <div key={n._id} className="bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
              {editingId === n._id ? (
                <div className="flex gap-1.5">
                  <input value={editDraft} onChange={(e) => setEditDraft(e.target.value)} className="input text-xs flex-1 py-1" autoFocus />
                  <button onClick={() => handleSaveEdit(n._id)} className="text-primary-600 text-xs font-medium">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 text-xs">Cancel</button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-gray-700">{n.note}</p>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => { setEditingId(n._id); setEditDraft(n.note); }} className="text-gray-400 hover:text-primary-600"><FiEdit2 size={11} /></button>
                    <button onClick={() => handleDelete(n._id)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={11} /></button>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(n.updatedAt)}</p>
            </div>
          ))}
          {notes.length === 0 && <p className="text-xs text-gray-400">No personal notes yet — add a reminder for yourself below.</p>}
        </div>
      )}
      <form onSubmit={handleAdd} className="flex gap-1.5">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Repeat CBC after 3 months" className="input text-xs flex-1 py-1.5" />
        <button type="submit" className="text-xs px-2.5 py-1.5 bg-primary-600 text-white rounded-lg flex items-center gap-1 shrink-0"><FiPlus size={11} /> Add</button>
      </form>
    </div>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    bookingApi.getById(id)
      .then((res) => setBooking(res.data.booking || res.data))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    reportApi.getAll({ booking: id }).then((res) => setReports(res.data.items || [])).catch(() => setReports([]));
  }, [id]);

  const openReport = async (reportId, inline) => {
    try {
      const res = await reportApi.getDownloadUrl(reportId, inline);
      window.open(res.data.url, '_blank');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

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

          {booking.reportStatus && booking.reportStatus !== 'none' && reports.length > 0 && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">Report</h2>
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r._id} className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FiFileText className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{r.fileName || 'report.pdf'}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => openReport(r._id, true)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-300">
                          <FiEye size={12} /> View
                        </button>
                        <button onClick={() => openReport(r._id, false)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
                          <FiDownload size={12} /> Download
                        </button>
                      </div>
                    </div>
                    <ReportNotes reportId={r._id} />
                  </div>
                ))}
              </div>
              {booking.reportStatus === 'partial' && (
                <p className="text-xs text-amber-600 mt-2">Some test results are still pending — this report will be updated once complete.</p>
              )}
            </div>
          )}

          {booking.patientSnapshot?.name && (
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">Patient</h2>
              <div className="text-sm text-gray-600">
                <p className="font-medium">{booking.patientSnapshot.name}</p>
                <p>{booking.patientSnapshot.age} yrs &bull; {booking.patientSnapshot.gender} &bull; {booking.patientSnapshot.relation}</p>
                {booking.patient?.patientId && (
                  <p className="text-xs text-gray-400 mt-1">Patient ID: {booking.patient.patientId}</p>
                )}
              </div>
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
