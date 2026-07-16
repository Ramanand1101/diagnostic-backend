'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import {
  FiUser, FiMail, FiPhone, FiMapPin, FiNavigation,
  FiSave, FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiLock, FiEye, FiEyeOff,
} from 'react-icons/fi';

const EMPTY_ADDRESS = { label: 'Home', line1: '', city: '', state: '', pincode: '' };

export default function ProfilePage() {
  const { user, login } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobile: user?.mobile || '',
    alternateMobile: user?.alternateMobile || '',
    alternateEmail: user?.alternateEmail || '',
  });

  const [addresses, setAddresses] = useState(user?.addresses?.length ? user.addresses : []);
  const [addingAddress, setAddingAddress] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [addressDraft, setAddressDraft] = useState(EMPTY_ADDRESS);

  const [location, setLocation] = useState(user?.location || null);
  const [detecting, setDetecting] = useState(false);
  const [manualAddress, setManualAddress] = useState(user?.location?.address || '');

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  const handlePwChange = (e) => setPwForm({ ...pwForm, [e.target.name]: e.target.value });

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match.'); return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.'); return;
    }
    setPwLoading(true);
    try {
      await userApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPwLoading(false);
    }
  };

  const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.(com|co\.in|co|in|net|info|ai)$/i;
  const MOBILE_RE = /^[6-9]\d{9}$/;

  const validateField = (name, value) => {
    if (!value) return '';
    if ((name === 'email' || name === 'alternateEmail') && !EMAIL_RE.test(value))
      return 'Invalid email. Allowed: .com .co .in .co.in .net .info .ai';
    if ((name === 'mobile' || name === 'alternateMobile') && !MOBILE_RE.test(value))
      return 'Must be exactly 10 digits and start with 6–9';
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const cleaned = (name === 'mobile' || name === 'alternateMobile')
      ? value.replace(/\D/g, '').slice(0, 10)
      : value;
    setForm({ ...form, [name]: cleaned });
    // Clear error while user is fixing it
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: '' });
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const err = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };
  const handleDraftChange = (e) => setAddressDraft({ ...addressDraft, [e.target.name]: e.target.value });

  // ── Location detection ─────────────────────────────────────────────
  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
          );
          const data = await res.json();
          const a = data.address || {};
          const parts = [
            a.house_number,
            a.road || a.pedestrian || a.street,
            a.neighbourhood || a.suburb,
            a.city || a.town || a.village,
            a.state,
            a.postcode,
          ].filter(Boolean);
          address = parts.length ? parts.join(', ') : (data.display_name || address);
        } catch { /* keep coordinates as fallback */ }
        setLocation({ lat, lng, address });
        setManualAddress(address);
        setDetecting(false);
        toast.success('Location detected!');
      },
      (err) => {
        setDetecting(false);
        toast.error(err.code === 1 ? 'Location permission denied' : 'Could not detect location');
      },
      { timeout: 10000 }
    );
  };

  // ── Address CRUD ───────────────────────────────────────────────────
  const openAdd = () => { setAddressDraft(EMPTY_ADDRESS); setAddingAddress(true); setEditingIndex(null); };
  const openEdit = (i) => { setAddressDraft({ ...addresses[i] }); setEditingIndex(i); setAddingAddress(false); };
  const cancelAddress = () => { setAddingAddress(false); setEditingIndex(null); };

  const saveAddress = () => {
    if (!addressDraft.line1 || !addressDraft.city) {
      toast.error('Street and city are required');
      return;
    }
    if (editingIndex !== null) {
      setAddresses(addresses.map((a, i) => i === editingIndex ? addressDraft : a));
    } else {
      setAddresses([...addresses, addressDraft]);
    }
    cancelAddress();
  };

  const removeAddress = (i) => setAddresses(addresses.filter((_, idx) => idx !== i));

  // ── Save profile ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate all fields and show ALL inline errors at once
    const errors = {};
    ['email', 'alternateEmail', 'mobile', 'alternateMobile'].forEach((name) => {
      const err = validateField(name, form[name]);
      if (err) errors[name] = err;
    });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the highlighted fields below.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        addresses,
        ...(location && { location: { ...location, address: manualAddress || location.address } }),
      };
      const res = await userApi.updateMe(payload);
      login(null, res.data.user || res.data);
      toast.success('Profile saved!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Avatar card */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-2xl flex-shrink-0">
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-400 capitalize">{user?.role}</p>
          <span className="badge bg-secondary-50 text-secondary-700 text-xs mt-1">Verified</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Personal info ── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
            <FiUser className="text-primary-500" /> Personal Information
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input name="name" required value={form.name} onChange={handleChange} className="input pl-9" placeholder="Your full name" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input name="email" type="text" value={form.email} onChange={handleChange} onBlur={handleBlur}
                className={`input pl-9 ${fieldErrors.email ? 'border-red-400 focus:ring-red-300' : ''}`}
                placeholder="you@example.com" />
            </div>
            {fieldErrors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠ Email — {fieldErrors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input name="mobile" type="tel" inputMode="numeric" maxLength={10} value={form.mobile}
                onChange={handleChange} onBlur={handleBlur}
                className={`input pl-9 ${fieldErrors.mobile ? 'border-red-400 focus:ring-red-300' : ''}`}
                placeholder="98765 43210" />
            </div>
            {fieldErrors.mobile && <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠ Mobile — {fieldErrors.mobile}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alternate Mobile Number <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input name="alternateMobile" type="tel" inputMode="numeric" maxLength={10} value={form.alternateMobile}
                onChange={handleChange} onBlur={handleBlur}
                className={`input pl-9 ${fieldErrors.alternateMobile ? 'border-red-400 focus:ring-red-300' : ''}`}
                placeholder="98765 43210" />
            </div>
            {fieldErrors.alternateMobile && <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠ Alternate Mobile — {fieldErrors.alternateMobile}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alternate Email Address <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input name="alternateEmail" type="text" value={form.alternateEmail}
                onChange={handleChange} onBlur={handleBlur}
                className={`input pl-9 ${fieldErrors.alternateEmail ? 'border-red-400 focus:ring-red-300' : ''}`}
                placeholder="alternate@example.com" />
            </div>
            {fieldErrors.alternateEmail && <p className="text-xs text-red-500 mt-1 flex items-center gap-1">⚠ Alternate Email — {fieldErrors.alternateEmail}</p>}
          </div>
        </div>

        {/* ── Saved addresses ── */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
              <FiMapPin className="text-primary-500" /> Saved Addresses
            </h2>
            {!addingAddress && editingIndex === null && (
              <button type="button" onClick={openAdd} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 font-medium">
                <FiPlus /> Add Address
              </button>
            )}
          </div>

          {/* Address list */}
          {addresses.length === 0 && !addingAddress && (
            <p className="text-sm text-gray-400 text-center py-2">No saved addresses yet.</p>
          )}

          {addresses.map((addr, i) => (
            editingIndex === i ? (
              <AddressForm key={i} draft={addressDraft} onChange={handleDraftChange} onSave={saveAddress} onCancel={cancelAddress} />
            ) : (
              <div key={i} className="border border-gray-100 rounded-xl p-4 flex items-start justify-between gap-3 bg-gray-50">
                <div className="space-y-0.5">
                  <span className="badge bg-primary-50 text-primary-700 text-xs">{addr.label || 'Address'}</span>
                  <p className="text-sm font-medium text-gray-800 mt-1">{addr.line1}</p>
                  <p className="text-xs text-gray-500">
                    {[addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button type="button" onClick={() => openEdit(i)} className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors">
                    <FiEdit2 className="text-sm" />
                  </button>
                  <button type="button" onClick={() => removeAddress(i)} className="p-1.5 text-gray-400 hover:text-accent-500 transition-colors">
                    <FiTrash2 className="text-sm" />
                  </button>
                </div>
              </div>
            )
          ))}

          {addingAddress && (
            <AddressForm draft={addressDraft} onChange={handleDraftChange} onSave={saveAddress} onCancel={cancelAddress} />
          )}
        </div>

        {/* ── GPS Location ── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
            <FiNavigation className="text-primary-500" /> Current Location <span className="text-xs font-normal text-gray-400">(for nearby labs)</span>
          </h2>

          {location ? (
            <div className="space-y-3">
              <div className="bg-secondary-50 border border-secondary-100 rounded-xl p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <FiMapPin className="text-secondary-600 mt-0.5 flex-shrink-0 text-sm" />
                  <p className="text-sm text-gray-700 leading-relaxed">{location.address}</p>
                </div>
                <div className="flex gap-4 text-xs text-gray-400 pl-5">
                  <span>Lat: {location.lat?.toFixed(6)}</span>
                  <span>Lng: {location.lng?.toFixed(6)}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Label</label>
                <input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  className="input text-sm"
                  placeholder="Edit readable address..."
                />
              </div>
              <button type="button" onClick={detectLocation} disabled={detecting}
                className="btn-outline text-sm flex items-center gap-2 w-full justify-center">
                {detecting ? <Spinner size="sm" /> : <FiNavigation className="text-sm" />}
                {detecting ? 'Detecting...' : 'Re-detect Location'}
              </button>
            </div>
          ) : (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-gray-500">Allow location to find nearby labs instantly.</p>
              <button type="button" onClick={detectLocation} disabled={detecting}
                className="btn-primary flex items-center gap-2 mx-auto">
                {detecting ? <Spinner size="sm" /> : <FiNavigation />}
                {detecting ? 'Detecting...' : 'Detect My Location'}
              </button>
              <p className="text-xs text-gray-400">Used only to suggest nearby diagnostic labs.</p>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3">
          {loading ? <Spinner size="sm" /> : <FiSave />}
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* ── Change Password ── */}
      <form onSubmit={handleChangePassword} className="space-y-4 mt-2">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
            <FiLock className="text-primary-500" /> Change Password
          </h2>

          {[
            { name: 'currentPassword', label: 'Current Password', key: 'current' },
            { name: 'newPassword',     label: 'New Password',     key: 'new' },
            { name: 'confirmPassword', label: 'Confirm New Password', key: 'confirm' },
          ].map(({ name, label, key }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  name={name}
                  type={showPw[key] ? 'text' : 'password'}
                  value={pwForm[name]}
                  onChange={handlePwChange}
                  required
                  className="input pl-9 pr-10"
                  placeholder={label}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => ({ ...p, [key]: !p[key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw[key] ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
                </button>
              </div>
            </div>
          ))}

          <button type="submit" disabled={pwLoading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3">
            {pwLoading ? <Spinner size="sm" /> : <FiLock />}
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddressForm({ draft, onChange, onSave, onCancel }) {
  const labels = ['Home', 'Work', 'Other'];
  return (
    <div className="border border-primary-200 rounded-xl p-4 bg-primary-50/30 space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
        <div className="flex gap-2">
          {labels.map((l) => (
            <button
              key={l} type="button"
              onClick={() => onChange({ target: { name: 'label', value: l } })}
              className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
                draft.label === l
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Street / Flat / Area <span className="text-accent-500">*</span></label>
        <input name="line1" value={draft.line1} onChange={onChange} className="input text-sm" placeholder="e.g. 123 MG Road, Near Bus Stand" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">City <span className="text-accent-500">*</span></label>
          <input name="city" value={draft.city} onChange={onChange} className="input text-sm" placeholder="Mumbai" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
          <input name="state" value={draft.state} onChange={onChange} className="input text-sm" placeholder="Maharashtra" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
        <input name="pincode" value={draft.pincode} onChange={onChange} className="input text-sm" placeholder="400001" maxLength={6} />
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onSave} className="btn-primary text-sm flex items-center gap-1.5 flex-1 justify-center">
          <FiCheck /> Save Address
        </button>
        <button type="button" onClick={onCancel} className="btn-outline text-sm flex items-center gap-1.5 px-4">
          <FiX /> Cancel
        </button>
      </div>
    </div>
  );
}
