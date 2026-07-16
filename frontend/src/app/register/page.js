'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { authApi, userApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/utils/helpers';
import HealthOnTimeLogo from '@/components/layout/HealthOnTimeLogo';
import { FiPhone, FiX } from 'react-icons/fi';
import Spinner from '@/components/ui/Spinner';

function PhoneModal({ onSave, onSkip }) {
  const [mobile, setMobile] = useState('');
  const [saving, setSaving] = useState(false);
  const { refreshUser } = useAuth();

  const handleSave = async (e) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setSaving(true);
    try {
      await userApi.updateMe({ mobile });
      await refreshUser(); // sync user.mobile into AuthContext immediately
      toast.success('Mobile number saved!');
      onSave();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button onClick={onSkip} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <FiX size={20} />
        </button>
        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
          <FiPhone className="text-green-600 text-xl" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Add your mobile number</h2>
        <p className="text-sm text-gray-500 text-center mb-5">
          Get booking updates &amp; OTP login on your phone.
        </p>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
            <span className="px-3 py-3 bg-gray-50 border-r border-gray-300 text-sm text-gray-500 font-medium">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              pattern="[6-9][0-9]{9}"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="98765 43210"
              autoFocus
              className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={saving || mobile.length !== 10}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving && <Spinner size="sm" />}
            Save &amp; Continue
          </button>
          <button type="button" onClick={onSkip} className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition">
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [phoneModal, setPhoneModal] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  const MOBILE_RE = /^[6-9]\d{9}$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'mobile') {
      setForm({ ...form, mobile: value.replace(/\D/g, '').slice(0, 10) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_RE.test(form.email)) {
      toast.error('Please enter a valid email address.'); return;
    }
    if (form.mobile && !MOBILE_RE.test(form.mobile)) {
      toast.error('Mobile number must be exactly 10 digits and start with 6–9.'); return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({
        name: form.name,
        email: form.email,
        mobile: form.mobile || undefined,
        password: form.password,
      });
      login(res.data.token, res.data.user);
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const res = await authApi.googleAuth(credentialResponse.credential);
      login(res.data.token, res.data.user);
      toast.success('Account created with Google!');
      if (!res.data.user?.mobile) {
        setPhoneModal(true);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const finishGoogleRegister = () => { setPhoneModal(false); router.push('/dashboard'); };

  return (
    <>
    {phoneModal && <PhoneModal onSave={finishGoogleRegister} onSkip={finishGoogleRegister} />}
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex mb-4">
            <HealthOnTimeLogo showTagline />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Join thousands of health-conscious users</p>
        </div>

        {/* Google Sign-Up */}
        <div className="mb-5 flex flex-col items-center gap-3">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google sign-up failed')}
            width="368"
            text="signup_with"
            shape="rectangular"
            logo_alignment="left"
          />
          <div className="flex items-center w-full gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">or register with email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="input"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              name="mobile"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              pattern="[6-9][0-9]{9}"
              value={form.mobile}
              onChange={handleChange}
              className="input"
              placeholder="98765 43210"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={handleChange}
              className="input"
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              value={form.confirmPassword}
              onChange={handleChange}
              className="input"
              placeholder="Re-enter password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {loading && <Spinner size="sm" />}
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
    </>
  );
}
