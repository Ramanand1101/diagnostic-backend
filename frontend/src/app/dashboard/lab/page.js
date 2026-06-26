'use client';
import { useState, useEffect } from 'react';
import { labApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import toast from 'react-hot-toast';
import Spinner, { PageLoader } from '@/components/ui/Spinner';
import {
  FiMapPin, FiPhone, FiMail, FiGlobe, FiClock,
  FiSave, FiNavigation, FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const REPORT_OPTIONS = [
  'Same day',
  'Within 4 hours',
  'Within 8 hours',
  'Within 24 hours',
  'Within 48 hours',
  '2–3 days',
  '3–5 days',
];

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

const EMPTY = {
  name: '', description: '', address: '', city: '', state: '', pincode: '',
  phone: '', email: '', website: '',
  homeCollection: false, lat: '', lng: '',
  accreditation: '',
};

const DEFAULT_SCHEDULE = {
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  openFrom: '09:00',
  openTo: '21:00',
  sampleFrom: '06:00',
  sampleTo: '12:00',
  reportDelivery: 'Same day',
};

export default function MyLabPage() {
  const [lab, setLab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    labApi.getMine()
      .then((res) => {
        if (res.data) {
          setLab(res.data);
          setForm({
            name: res.data.name || '',
            description: res.data.description || '',
            address: res.data.address || '',
            city: res.data.city || '',
            state: res.data.state || '',
            pincode: res.data.pincode || '',
            phone: res.data.phone || '',
            email: res.data.email || '',
            website: res.data.website || '',
            homeCollection: res.data.homeCollection || false,
            lat: res.data.lat || '',
            lng: res.data.lng || '',
            accreditation: (res.data.accreditation || []).join(', '),
          });
          // Restore schedule from saved strings if possible
          setSchedule((prev) => ({
            ...prev,
            reportDelivery: REPORT_OPTIONS.includes(res.data.reportDeliveryTime)
              ? res.data.reportDeliveryTime
              : (res.data.reportDeliveryTime || prev.reportDelivery),
          }));
        } else {
          setIsNew(true);
        }
      })
      .catch(() => setIsNew(true))
      .finally(() => setLoading(false));
  }, []);

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleDay = (day) => {
    setSchedule((s) => ({
      ...s,
      days: s.days.includes(day) ? s.days.filter((d) => d !== day) : [...s.days, day],
    }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
          );
          const data = await res.json();
          const a = data.address || {};
          const street = [
            a.house_number,
            a.road || a.pedestrian || a.footway || a.street,
            a.neighbourhood || a.suburb || a.quarter,
          ].filter(Boolean).join(', ');
          setForm((f) => ({
            ...f,
            lat: latitude.toFixed(6),
            lng: longitude.toFixed(6),
            ...(street && { address: street }),
            ...(a.city || a.town || a.village ? { city: a.city || a.town || a.village } : {}),
            ...(a.state ? { state: a.state } : {}),
            ...(a.postcode ? { pincode: a.postcode } : {}),
          }));
          toast.success('Location & address auto-filled!');
        } catch {
          setForm((f) => ({ ...f, lat: latitude.toFixed(6), lng: longitude.toFixed(6) }));
          toast.success('Coordinates captured');
        }
        setDetecting(false);
      },
      () => { setDetecting(false); toast.error('Could not detect location'); },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (schedule.days.length === 0) { toast.error('Select at least one working day'); return; }
    setSaving(true);
    try {
      const openingHours = `${schedule.days.join(', ')}: ${fmtTime(schedule.openFrom)} – ${fmtTime(schedule.openTo)}`;
      const sampleCollectionTime = `${fmtTime(schedule.sampleFrom)} – ${fmtTime(schedule.sampleTo)}`;

      const payload = {
        ...form,
        openingHours,
        sampleCollectionTime,
        reportDeliveryTime: schedule.reportDelivery,
        lat: form.lat ? Number(form.lat) : undefined,
        lng: form.lng ? Number(form.lng) : undefined,
        accreditation: form.accreditation.split(',').map((s) => s.trim()).filter(Boolean),
      };

      let res;
      if (isNew || !lab) {
        res = await labApi.create(payload);
        setIsNew(false);
        toast.success('Lab profile created!');
      } else {
        res = await labApi.update(lab._id, payload);
        toast.success('Lab profile updated!');
      }
      setLab(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Lab Profile</h1>
        {lab && (
          <span className={`badge text-xs flex items-center gap-1 ${
            lab.verificationStatus === 'verified' ? 'bg-secondary-50 text-secondary-700' :
            lab.verificationStatus === 'rejected' ? 'bg-accent-50 text-accent-700' :
            'bg-yellow-50 text-yellow-700'
          }`}>
            {lab.verificationStatus === 'verified' && <FiCheckCircle />}
            {lab.verificationStatus === 'rejected' && <FiAlertCircle />}
            {lab.verificationStatus || 'Pending'}
          </span>
        )}
      </div>

      {isNew && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 text-sm text-primary-800">
          You haven&apos;t set up your lab profile yet. Fill in the details below and submit for admin approval.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Basic Info */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 text-base">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lab Name <span className="text-accent-500">*</span></label>
            <input name="name" required value={form.name} onChange={handle} className="input" placeholder="e.g. HealthPlus Diagnostic Centre" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handle} rows={3} className="input resize-none" placeholder="About your lab, specializations, services..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input name="phone" value={form.phone} onChange={handle} className="input pl-9" placeholder="9876543210" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input name="email" type="email" value={form.email} onChange={handle} className="input pl-9" placeholder="lab@example.com" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <div className="relative">
              <FiGlobe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input name="website" value={form.website} onChange={handle} className="input pl-9" placeholder="https://yourlab.com" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
            <FiMapPin className="text-primary-500" /> Address
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Street / Area <span className="text-accent-500">*</span></label>
            <input name="address" required value={form.address} onChange={handle} className="input" placeholder="123 MG Road, Near City Hospital" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-accent-500">*</span></label>
              <input name="city" required value={form.city} onChange={handle} className="input" placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input name="state" value={form.state} onChange={handle} className="input" placeholder="Maharashtra" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input name="pincode" value={form.pincode} onChange={handle} className="input" placeholder="400001" maxLength={6} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">GPS Coordinates <span className="text-xs text-gray-400">(for nearby search)</span></label>
            <div className="grid grid-cols-2 gap-3">
              <input name="lat" value={form.lat} onChange={handle} className="input text-sm" placeholder="Latitude e.g. 19.0760" />
              <input name="lng" value={form.lng} onChange={handle} className="input text-sm" placeholder="Longitude e.g. 72.8777" />
            </div>
            <button type="button" onClick={detectLocation} disabled={detecting}
              className="btn-outline text-sm flex items-center gap-2">
              {detecting ? <Spinner size="sm" /> : <FiNavigation className="text-sm" />}
              {detecting ? 'Detecting...' : 'Auto-detect Location'}
            </button>
          </div>
        </div>

        {/* Operations */}
        <div className="card space-y-5">
          <h2 className="font-semibold text-gray-900 text-base flex items-center gap-2">
            <FiClock className="text-primary-500" /> Operations
          </h2>

          {/* Working Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
            <div className="flex gap-2 flex-wrap">
              {ALL_DAYS.map((day) => {
                const active = schedule.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`w-12 h-10 text-xs font-semibold rounded-lg border transition-colors ${
                      active
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {schedule.days.length === 0 && (
              <p className="text-xs text-accent-500 mt-1">Please select at least one day</p>
            )}
          </div>

          {/* Opening Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Opening Hours</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Opens at</p>
                <input
                  type="time"
                  value={schedule.openFrom}
                  onChange={(e) => setSchedule((s) => ({ ...s, openFrom: e.target.value }))}
                  className="input text-sm"
                />
              </div>
              <span className="text-gray-400 mt-5">–</span>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Closes at</p>
                <input
                  type="time"
                  value={schedule.openTo}
                  onChange={(e) => setSchedule((s) => ({ ...s, openTo: e.target.value }))}
                  className="input text-sm"
                />
              </div>
            </div>
            {schedule.days.length > 0 && (
              <p className="text-xs text-primary-600 mt-1.5">
                {schedule.days.join(', ')}: {fmtTime(schedule.openFrom)} – {fmtTime(schedule.openTo)}
              </p>
            )}
          </div>

          {/* Sample Collection Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sample Collection Time</label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">From</p>
                <input
                  type="time"
                  value={schedule.sampleFrom}
                  onChange={(e) => setSchedule((s) => ({ ...s, sampleFrom: e.target.value }))}
                  className="input text-sm"
                />
              </div>
              <span className="text-gray-400 mt-5">–</span>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">To</p>
                <input
                  type="time"
                  value={schedule.sampleTo}
                  onChange={(e) => setSchedule((s) => ({ ...s, sampleTo: e.target.value }))}
                  className="input text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-primary-600 mt-1.5">
              {fmtTime(schedule.sampleFrom)} – {fmtTime(schedule.sampleTo)}
            </p>
          </div>

          {/* Report Delivery */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Delivery Time</label>
            <div className="flex flex-wrap gap-2">
              {REPORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSchedule((s) => ({ ...s, reportDelivery: opt }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    schedule.reportDelivery === opt
                      ? 'bg-secondary-500 text-white border-secondary-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-secondary-300 hover:text-secondary-600'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Accreditation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accreditation <span className="text-xs text-gray-400">(comma-separated)</span></label>
            <input name="accreditation" value={form.accreditation} onChange={handle} className="input" placeholder="NABL, CAP, ISO 15189" />
          </div>

          {/* Home Collection toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input type="checkbox" name="homeCollection" checked={form.homeCollection} onChange={handle} className="sr-only" />
              <div className={`w-10 h-6 rounded-full transition-colors ${form.homeCollection ? 'bg-secondary-500' : 'bg-gray-300'}`} />
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.homeCollection ? 'translate-x-4' : ''}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">Home Sample Collection Available</span>
          </label>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
          {saving ? <Spinner size="sm" /> : <FiSave />}
          {saving ? 'Saving...' : isNew ? 'Submit Lab Profile' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
