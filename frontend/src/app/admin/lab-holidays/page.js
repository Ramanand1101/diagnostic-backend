'use client';
import { useState, useEffect, useCallback } from 'react';
import { labHolidayApi, labApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import CsvUploadSection from '@/components/ui/CsvUploadSection';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit, FiTrash2, FiCalendar, FiList, FiX, FiToggleLeft, FiToggleRight,
} from 'react-icons/fi';

const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function scopeLabel(h) {
  if (h.scope === 'lab') return h.lab?.name || 'Lab';
  if (h.scope === 'city') return `City: ${h.city}`;
  if (h.scope === 'state') return `State: ${h.state}`;
  return 'All labs';
}

function whenLabel(h) {
  if (h.recurrence === 'once') return formatDate(h.date);
  if (h.recurrence === 'range') return `${formatDate(h.startDate)} – ${formatDate(h.endDate)}`;
  return `Every ${DAY_NAMES[h.dayOfWeek]}`;
}

// ── Add/Edit form ──────────────────────────────────────────────────────────────
function HolidayForm({ initial, labs, onSave, onClose }) {
  const [form, setForm] = useState({
    scope: initial?.scope || 'lab',
    lab: initial?.lab?._id || initial?.lab || '',
    city: initial?.city || '',
    state: initial?.state || '',
    recurrence: initial?.recurrence || 'once',
    date: initial?.date ? initial.date.slice(0, 10) : '',
    startDate: initial?.startDate ? initial.startDate.slice(0, 10) : '',
    endDate: initial?.endDate ? initial.endDate.slice(0, 10) : '',
    dayOfWeek: initial?.dayOfWeek ?? 0,
    reason: initial?.reason || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.scope === 'lab' && !form.lab) return toast.error('Select a lab');
    if (form.scope === 'city' && !form.city.trim()) return toast.error('Enter a city');
    if (form.scope === 'state' && !form.state) return toast.error('Select a state');
    if (form.recurrence === 'once' && !form.date) return toast.error('Select a date');
    if (form.recurrence === 'range' && (!form.startDate || !form.endDate)) return toast.error('Select start and end dates');
    if (form.recurrence === 'range' && form.startDate > form.endDate) return toast.error('Start date must be before end date');

    setSaving(true);
    try {
      if (initial?._id) await labHolidayApi.update(initial._id, form);
      else await labHolidayApi.create(form);
      toast.success(initial ? 'Holiday updated!' : 'Holiday added!');
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Applies to</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { v: 'lab', l: 'One Lab' },
            { v: 'city', l: 'City' },
            { v: 'state', l: 'State' },
            { v: 'all', l: 'All Labs' },
          ].map((o) => (
            <button key={o.v} type="button" onClick={() => set('scope', o.v)}
              className={`py-2 text-xs font-medium rounded-lg border transition-colors ${form.scope === o.v ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600 hover:border-primary-300'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {form.scope === 'lab' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lab</label>
          <select value={form.lab} onChange={(e) => set('lab', e.target.value)} className="input" required>
            <option value="">Select lab</option>
            {labs.map((l) => <option key={l._id} value={l._id}>{l.name} — {l.city}</option>)}
          </select>
        </div>
      )}
      {form.scope === 'city' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input value={form.city} onChange={(e) => set('city', e.target.value)} className="input" placeholder="e.g. Lucknow" required />
        </div>
      )}
      {form.scope === 'state' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <select value={form.state} onChange={(e) => set('state', e.target.value)} className="input" required>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Recurrence</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { v: 'once', l: 'Single Day' },
            { v: 'range', l: 'Date Range' },
            { v: 'weekly', l: 'Weekly (e.g. every Sunday)' },
          ].map((o) => (
            <button key={o.v} type="button" onClick={() => set('recurrence', o.v)}
              className={`py-2 text-xs font-medium rounded-lg border transition-colors ${form.recurrence === o.v ? 'bg-secondary-600 text-white border-secondary-600' : 'border-gray-200 text-gray-600 hover:border-secondary-300'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      {form.recurrence === 'once' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="input" required />
        </div>
      )}
      {form.recurrence === 'range' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className="input" required />
          </div>
        </div>
      )}
      {form.recurrence === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
          <select value={form.dayOfWeek} onChange={(e) => set('dayOfWeek', Number(e.target.value))} className="input">
            {DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
        <input value={form.reason} onChange={(e) => set('reason', e.target.value)} className="input" placeholder="e.g. Independence Day, Festival break…" />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save Holiday'}</button>
      </div>
    </form>
  );
}

// ── Simple month-grid calendar view ───────────────────────────────────────────
function CalendarView({ holidays }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const holidaysOnDay = (day) => {
    const d = new Date(year, month, day); d.setHours(0, 0, 0, 0);
    return holidays.filter((h) => {
      if (!h.active) return false;
      if (h.recurrence === 'once') { const hd = new Date(h.date); hd.setHours(0, 0, 0, 0); return hd.getTime() === d.getTime(); }
      if (h.recurrence === 'range') { const sd = new Date(h.startDate); sd.setHours(0, 0, 0, 0); const ed = new Date(h.endDate); ed.setHours(0, 0, 0, 0); return d >= sd && d <= ed; }
      if (h.recurrence === 'weekly') return d.getDay() === h.dayOfWeek;
      return false;
    });
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">‹ Prev</button>
        <p className="font-bold text-gray-800">{cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Next ›</button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {DAY_NAMES.map((d) => <div key={d} className="text-[10px] font-bold text-gray-400 uppercase py-1">{d.slice(0, 3)}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dayHolidays = holidaysOnDay(day);
          return (
            <div key={i} title={dayHolidays.map((h) => `${scopeLabel(h)}${h.reason ? ` — ${h.reason}` : ''}`).join('\n')}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium border ${
                dayHolidays.length ? 'bg-red-50 border-red-200 text-red-700' : 'border-gray-100 text-gray-600'
              }`}>
              {day}
              {dayHolidays.length > 0 && <span className="w-1 h-1 rounded-full bg-red-500 mt-0.5" />}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-3">Hover a highlighted date to see which holiday rule(s) apply.</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LabHolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'calendar'
  const [filters, setFilters] = useState({ scope: '', active: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchHolidays = useCallback(() => {
    setLoading(true);
    const params = { limit: 500 };
    if (filters.scope) params.scope = filters.scope;
    if (filters.active) params.active = filters.active;
    labHolidayApi.getAll(params)
      .then((res) => setHolidays(res.data.items || []))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);
  useEffect(() => { labApi.getAll({ limit: 500, approved: true }).then((r) => setLabs(r.data.items || [])); }, []);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (h) => { setEditing(h); setModalOpen(true); };

  const handleToggle = async (h) => {
    try {
      await labHolidayApi.toggleActive(h._id);
      toast.success(h.active ? 'Holiday deactivated' : 'Holiday activated');
      fetchHolidays();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleDelete = async (h) => {
    if (!confirm('Delete this holiday rule?')) return;
    try {
      await labHolidayApi.remove(h._id);
      toast.success('Holiday deleted');
      fetchHolidays();
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Holiday' : 'Add Holiday'} size="md">
        <HolidayForm
          initial={editing}
          labs={labs}
          onSave={() => { setModalOpen(false); fetchHolidays(); }}
          onClose={() => setModalOpen(false)}
        />
      </Modal>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lab Holiday Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mark holidays for labs — bookings won&apos;t be allowed on these dates.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setView('list')} className={`px-3 py-2 text-sm flex items-center gap-1.5 ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}>
              <FiList size={14} /> List
            </button>
            <button onClick={() => setView('calendar')} className={`px-3 py-2 text-sm flex items-center gap-1.5 ${view === 'calendar' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'}`}>
              <FiCalendar size={14} /> Calendar
            </button>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 text-sm px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium">
            <FiPlus size={14} /> Add Holiday
          </button>
        </div>
      </div>

      <CsvUploadSection
        title="Bulk Upload Holidays via CSV"
        description="Add many holidays at once — one row per rule (lab/city/state/all, once/range/weekly)."
        onDemoDownload={labHolidayApi.demoCsv}
        onUpload={labHolidayApi.bulkCsv}
        demoFileName="lab-holidays-template.csv"
        onSuccess={fetchHolidays}
      />

      {view === 'calendar' ? (
        loading ? <PageLoader /> : <CalendarView holidays={holidays} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {['', 'lab', 'city', 'state', 'all'].map((s) => (
              <button key={s} onClick={() => setFilters((f) => ({ ...f, scope: s }))}
                className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize ${filters.scope === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {s || 'All Scopes'}
              </button>
            ))}
            <span className="w-px bg-gray-200 mx-1" />
            {[{ v: '', l: 'All' }, { v: 'true', l: 'Active' }, { v: 'false', l: 'Inactive' }].map((o) => (
              <button key={o.v} onClick={() => setFilters((f) => ({ ...f, active: o.v }))}
                className={`px-3 py-1.5 text-xs font-medium rounded-full ${filters.active === o.v ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {o.l}
              </button>
            ))}
          </div>

          {loading ? <PageLoader /> : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="table-header">Applies To</th>
                      <th className="table-header">When</th>
                      <th className="table-header">Reason</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Created By</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {holidays.map((h) => (
                      <tr key={h._id} className="hover:bg-gray-50">
                        <td className="table-cell font-medium text-sm text-gray-800">{scopeLabel(h)}</td>
                        <td className="table-cell text-sm text-gray-600">{whenLabel(h)}</td>
                        <td className="table-cell text-sm text-gray-500">{h.reason || '—'}</td>
                        <td className="table-cell">
                          <button onClick={() => handleToggle(h)} className={`flex items-center gap-1 text-xs font-semibold ${h.active ? 'text-green-600' : 'text-gray-400'}`}>
                            {h.active ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                            {h.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="table-cell text-sm text-gray-500">{h.createdBy?.name || '—'}</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(h)} title="Edit" className="text-gray-400 hover:text-primary-600"><FiEdit size={14} /></button>
                            <button onClick={() => handleDelete(h)} title="Delete" className="text-gray-400 hover:text-red-600"><FiTrash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {holidays.length === 0 && (
                      <tr><td colSpan={6} className="table-cell text-center text-gray-400 py-10">No holidays configured</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
