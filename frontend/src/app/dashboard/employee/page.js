'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { corporateAppointmentApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import { DateSelectPicker, TimeSlotPicker } from '@/components/booking/DateTimePicker';
import toast from 'react-hot-toast';
import { FiRefreshCw, FiDownload, FiFileText } from 'react-icons/fi';

const STATUS_LABEL = {
  pending: 'Pending',
  sent_to_lab: 'Sent to Lab',
  confirmed: 'Confirmed',
  alternate_requested: 'Alternate Requested',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Report Complete',
};
const STATUS_COLOR = {
  pending: 'bg-gray-100 text-gray-600',
  sent_to_lab: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  alternate_requested: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-600',
  cancelled: 'bg-red-100 text-red-600',
  completed: 'bg-purple-100 text-purple-700',
};

const _td0 = new Date();
const TODAY = `${_td0.getFullYear()}-${String(_td0.getMonth() + 1).padStart(2, '0')}-${String(_td0.getDate()).padStart(2, '0')}`;
const _maxD0 = new Date(); _maxD0.setDate(_maxD0.getDate() + 30);
const MAX_BOOKING_DATE = `${_maxD0.getFullYear()}-${String(_maxD0.getMonth() + 1).padStart(2, '0')}-${String(_maxD0.getDate()).padStart(2, '0')}`;

function AppointmentDetail({ appointment, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ slotDate: TODAY, slotTime: '', reason: '' });
  const a = appointment;

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      onChanged();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setBusy(false); }
  };

  const handleDownloadReport = async () => {
    try {
      const res = await corporateAppointmentApi.getReportUrl(a._id);
      window.open(res.data.url, '_blank');
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{a.appointmentNo}</h2>
        <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
        <div><p className="text-xs text-gray-400">Lab</p><p className="font-medium">{a.lab?.name} ({a.lab?.city})</p></div>
        <div><p className="text-xs text-gray-400">Date / Time</p><p className="font-medium">{a.slotDate ? new Date(a.slotDate).toDateString() : 'TBD'} {a.slotTime}</p></div>
        <div className="col-span-2"><p className="text-xs text-gray-400">Tests</p><p className="font-medium">{(a.items || []).map((i) => i.name).join(', ') || '—'}</p></div>
      </div>

      {a.reportStatus === 'partial' && (a.missingTests || []).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          Partial report received — still pending: <span className="font-semibold">{a.missingTests.join(', ')}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!['cancelled', 'rejected', 'completed'].includes(a.status) && (
          <button onClick={() => setShowReschedule((v) => !v)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 flex items-center gap-1">
            <FiRefreshCw size={11} /> Reschedule
          </button>
        )}
        {a.reportKey && (
          <button onClick={handleDownloadReport} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-300 flex items-center gap-1">
            <FiDownload size={11} /> Download Report
          </button>
        )}
      </div>

      {showReschedule && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New Date</label>
            <DateSelectPicker value={rescheduleForm.slotDate} onChange={(v) => setRescheduleForm((f) => ({ ...f, slotDate: v }))} minDate={TODAY} maxDate={MAX_BOOKING_DATE} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <TimeSlotPicker value={rescheduleForm.slotTime} onChange={(v) => setRescheduleForm((f) => ({ ...f, slotTime: v }))} slotDate={rescheduleForm.slotDate} onlyMorning />
          </div>
          <input value={rescheduleForm.reason} onChange={(e) => setRescheduleForm((f) => ({ ...f, reason: e.target.value }))} className="input text-sm" placeholder="Remark (optional)" />
          <button disabled={busy} onClick={() => run(() => corporateAppointmentApi.reschedule(a._id, rescheduleForm), 'Appointment rescheduled')} className="btn-primary text-xs px-3 py-1.5">Save Reschedule</button>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary text-sm">Close</button>
      </div>
    </div>
  );
}

export default function EmployeeAppointmentsPage() {
  const { user, loading: authLoading, isEmployee } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!authLoading && user && !isEmployee) router.push('/dashboard');
  }, [authLoading, user, isEmployee]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAppointments = useCallback(() => {
    if (!isEmployee) return;
    setLoading(true);
    corporateAppointmentApi.getAll({ limit: 100 })
      .then((res) => setAppointments(res.data.items || []))
      .finally(() => setLoading(false));
  }, [isEmployee]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const refreshModal = async () => {
    if (!modal?.appointment?._id) return;
    const res = await corporateAppointmentApi.getOne(modal.appointment._id);
    setModal((m) => ({ ...m, appointment: res.data }));
    fetchAppointments();
  };

  if (authLoading) return <PageLoader />;
  if (!isEmployee) return null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>

      {loading ? <PageLoader /> : appointments.length === 0 ? (
        <div className="card p-8 text-center">
          <FiFileText className="text-3xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No appointments yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {appointments.map((a) => (
            <div key={a._id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-gray-400">{a.appointmentNo}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              </div>
              <p className="font-medium text-gray-900">{a.lab?.name}</p>
              <p className="text-xs text-gray-500">{a.slotDate ? formatDate(a.slotDate) : 'Date TBD'} {a.slotTime}</p>
              <p className="text-xs text-gray-400">{(a.items || []).map((i) => i.name).join(', ') || '—'}</p>
              <button onClick={() => setModal({ appointment: a })} className="w-full mt-2 text-sm px-3 py-2 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-300">
                Manage
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title="Appointment Details" size="md">
        {modal?.appointment && (
          <AppointmentDetail appointment={modal.appointment} onClose={() => setModal(null)} onChanged={refreshModal} />
        )}
      </Modal>
    </div>
  );
}
