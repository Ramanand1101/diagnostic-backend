'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { corporateApi, corporateAppointmentApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { DateSelectPicker, TimeSlotPicker } from '@/components/booking/DateTimePicker';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiFileText, FiDownload, FiRefreshCw, FiX } from 'react-icons/fi';

const STATUS_LABEL = {
  pending: 'Pending',
  sent_to_lab: 'Sent to Lab',
  confirmed: 'Confirmed',
  alternate_requested: 'Alternate Requested',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Report Uploaded',
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

// ── Schedule form (no corporate picker — always "my" corporate) ───────────────
function ScheduleForm({ myCorporate, onSave, onClose }) {
  const [form, setForm] = useState({
    employeeName: '', employeeEmail: '', employeePhone: '', employeeId: '',
    lab: '', package: '', slotDate: TODAY, slotTime: '', notes: '',
  });
  const [customItems, setCustomItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addCustomItem = () => setCustomItems([...customItems, { name: '', price: '' }]);
  const updateCustomItem = (i, k, v) => setCustomItems(customItems.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const removeCustomItem = (i) => setCustomItems(customItems.filter((_, idx) => idx !== i));

  const assignedLabs = myCorporate?.assignedLabs || [];
  const assignedPackages = myCorporate?.packages || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeName.trim()) return toast.error('Employee name is required');
    if (!form.lab) return toast.error('Select a lab');
    setLoading(true);
    try {
      await corporateAppointmentApi.create({
        employee: { name: form.employeeName, email: form.employeeEmail, phone: form.employeePhone, employeeId: form.employeeId },
        lab: form.lab,
        package: form.package || undefined,
        items: form.package ? undefined : customItems.filter((i) => i.name.trim()).map((i) => ({ name: i.name, price: Number(i.price) || 0 })),
        slotDate: form.slotDate || undefined,
        slotTime: form.slotTime || undefined,
        notes: form.notes,
      });
      toast.success('Appointment scheduled!');
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {assignedLabs.length === 0 && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          No labs assigned to your account yet. Contact HealthOnTime support.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name *</label>
          <input required value={form.employeeName} onChange={(e) => set('employeeName', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
          <input value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} className="input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Email</label>
          <input type="email" value={form.employeeEmail} onChange={(e) => set('employeeEmail', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee Phone</label>
          <input type="tel" value={form.employeePhone} onChange={(e) => set('employeePhone', e.target.value)} className="input" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Lab / Diagnostic Centre *</label>
        <select required value={form.lab} onChange={(e) => set('lab', e.target.value)} className="input">
          <option value="">Select assigned lab…</option>
          {assignedLabs.map((l) => <option key={l._id} value={l._id}>{l.name} ({l.city})</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Package (optional)</label>
        <select value={form.package} onChange={(e) => set('package', e.target.value)} className="input">
          <option value="">— No package, add tests manually —</option>
          {assignedPackages.map((p) => <option key={p.package?._id} value={p.package?._id}>{p.package?.name} (₹{p.price})</option>)}
        </select>
      </div>

      {!form.package && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Tests</label>
            <button type="button" onClick={addCustomItem} className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
              <FiPlus size={10} /> Add Test
            </button>
          </div>
          <div className="space-y-2">
            {customItems.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input value={item.name} onChange={(e) => updateCustomItem(i, 'name', e.target.value)} className="input flex-1" placeholder="Test name" />
                <input type="number" value={item.price} onChange={(e) => updateCustomItem(i, 'price', e.target.value)} className="input w-24" placeholder="Price" />
                <button type="button" onClick={() => removeCustomItem(i)} className="text-red-400 hover:text-red-600 px-2"><FiX /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Date</label>
        <DateSelectPicker value={form.slotDate} onChange={(v) => set('slotDate', v)} minDate={TODAY} maxDate={MAX_BOOKING_DATE} />
        <p className="text-[10px] text-gray-400 mt-1">Appointments can be scheduled up to 30 days in advance</p>
      </div>
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <TimeSlotPicker value={form.slotTime} onChange={(v) => set('slotTime', v)} slotDate={form.slotDate} onlyMorning />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className="input" rows={2} />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Scheduling...' : 'Schedule Appointment'}</button>
      </div>
    </form>
  );
}

// ── Appointment detail (self-service actions only: reschedule, cancel, download report) ──
function AppointmentDetail({ appointment, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ slotDate: '', slotTime: '', reason: '' });
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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{a.appointmentNo}</h2>
          <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-xl p-4">
        <div><p className="text-xs text-gray-400">Lab</p><p className="font-medium">{a.lab?.name} ({a.lab?.city})</p></div>
        <div><p className="text-xs text-gray-400">Employee</p><p className="font-medium">{a.employee?.name}</p></div>
        <div><p className="text-xs text-gray-400">Date / Time</p><p className="font-medium">{a.slotDate ? new Date(a.slotDate).toDateString() : 'TBD'} {a.slotTime}</p></div>
        <div><p className="text-xs text-gray-400">Tests</p><p className="font-medium">{(a.items || []).map((i) => i.name).join(', ') || '—'}</p></div>
      </div>

      {a.alternateRequest?.type && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          HealthOnTime has requested an alternate {a.alternateRequest.type} for this appointment. {a.alternateRequest.note}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!['cancelled', 'rejected', 'completed'].includes(a.status) && (
          <>
            <button onClick={() => setShowReschedule((v) => !v)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-primary-300 flex items-center gap-1"><FiRefreshCw size={11} /> Reschedule</button>
            <button disabled={busy} onClick={() => { if (confirm('Cancel this appointment?')) run(() => corporateAppointmentApi.cancel(a._id, 'Cancelled by corporate'), 'Appointment cancelled'); }} className="text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50">Cancel</button>
          </>
        )}
        {a.reportKey && (
          <button onClick={handleDownloadReport} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-300 flex items-center gap-1"><FiDownload size={11} /> Download Report</button>
        )}
      </div>

      {showReschedule && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New Date</label>
            <DateSelectPicker
              value={rescheduleForm.slotDate}
              onChange={(v) => setRescheduleForm((f) => ({ ...f, slotDate: v }))}
              minDate={TODAY}
              maxDate={MAX_BOOKING_DATE}
            />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            <TimeSlotPicker
              value={rescheduleForm.slotTime}
              onChange={(v) => setRescheduleForm((f) => ({ ...f, slotTime: v }))}
              slotDate={rescheduleForm.slotDate}
              onlyMorning
            />
          </div>
          <input value={rescheduleForm.reason} onChange={(e) => setRescheduleForm((f) => ({ ...f, reason: e.target.value }))} className="input text-sm" placeholder="Remark (optional)" />
          <button disabled={busy} onClick={() => run(() => corporateAppointmentApi.reschedule(a._id, rescheduleForm), 'Appointment rescheduled')} className="btn-primary text-xs px-3 py-1.5">Save Reschedule</button>
        </div>
      )}

      {(a.rescheduleHistory || []).length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Reschedule History</p>
          <div className="space-y-2">
            {a.rescheduleHistory.map((h, i) => (
              <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <p>{h.fromDate ? new Date(h.fromDate).toDateString() : '—'} {h.fromTime} → {h.toDate ? new Date(h.toDate).toDateString() : '—'} {h.toTime}</p>
                <p className="mt-0.5 text-gray-600"><span className="font-semibold">Remark:</span> {h.reason || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary text-sm">Close</button>
      </div>
    </div>
  );
}

export default function CorporateAppointmentsPage() {
  const { user, loading: authLoading, isCorporate } = useAuth();
  const router = useRouter();
  const [myCorporate, setMyCorporate] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (!authLoading && user && !isCorporate) router.push('/dashboard');
  }, [authLoading, user, isCorporate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isCorporate) return;
    corporateApi.getMine().then((r) => setMyCorporate(r.data));
  }, [isCorporate]);

  const fetchAppointments = useCallback(() => {
    if (!isCorporate) return;
    setLoading(true);
    const params = { page, limit, q: q || undefined };
    if (status) params.status = status;
    corporateAppointmentApi.getAll(params)
      .then((res) => { setAppointments(res.data.items || []); setTotal(res.data.total || 0); })
      .finally(() => setLoading(false));
  }, [isCorporate, page, limit, status, q]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setQ(val); setPage(1); }, 400);
  };

  const refreshModal = async () => {
    if (!modal?.appointment?._id) return;
    const res = await corporateAppointmentApi.getOne(modal.appointment._id);
    setModal((m) => ({ ...m, appointment: res.data }));
    fetchAppointments();
  };

  if (authLoading) return <PageLoader />;
  if (!isCorporate) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
        <button onClick={() => setModal({ type: 'schedule' })} disabled={!myCorporate?.active}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40">
          <FiPlus /> Schedule Appointment
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input type="text" placeholder="Search by employee or appointment #…" onChange={handleSearchChange} className="input pl-9 py-2 text-sm w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {['', ...Object.keys(STATUS_LABEL)].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                status === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-primary-300'
              }`}>{s === '' ? 'All' : STATUS_LABEL[s]}</button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">{total} total</span>
      </div>

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Appointment #</th>
                  <th className="table-header">Employee</th>
                  <th className="table-header">Lab</th>
                  <th className="table-header">Date / Time</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((a) => (
                  <tr key={a._id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-medium">{a.appointmentNo}</td>
                    <td className="table-cell">{a.employee?.name}</td>
                    <td className="table-cell">{a.lab?.name}</td>
                    <td className="table-cell">{a.slotDate ? formatDate(a.slotDate) : '—'} {a.slotTime}</td>
                    <td className="table-cell">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[a.status]}`}>{STATUS_LABEL[a.status]}</span>
                    </td>
                    <td className="table-cell">
                      <button onClick={() => setModal({ type: 'view', appointment: a })} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-300">Manage</button>
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-10">No appointments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} onLimitChange={(l) => { setLimit(l); setPage(1); }} />

      <Modal open={modal?.type === 'schedule'} onClose={() => setModal(null)} title="Schedule Appointment" size="lg">
        <ScheduleForm myCorporate={myCorporate} onSave={() => { setModal(null); fetchAppointments(); }} onClose={() => setModal(null)} />
      </Modal>

      <Modal open={modal?.type === 'view'} onClose={() => setModal(null)} title="Manage Appointment" size="md">
        {modal?.appointment && (
          <AppointmentDetail appointment={modal.appointment} onClose={() => setModal(null)} onChanged={refreshModal} />
        )}
      </Modal>
    </div>
  );
}
