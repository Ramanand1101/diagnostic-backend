'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/utils/helpers';
import { MdBiotech } from 'react-icons/md';
import Spinner from '@/components/ui/Spinner';

function redirectAfterLogin(role, router) {
  router.push(role === 'superadmin' || role === 'subadmin' ? '/admin' : '/dashboard');
}

export default function LoginPage() {
  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [step, setStep] = useState(1);           // OTP: 1 = enter identifier, 2 = enter OTP
  const [form, setForm] = useState({ emailOrMobile: '', password: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const switchMode = (m) => {
    setMode(m);
    setStep(1);
    setForm({ emailOrMobile: form.emailOrMobile, password: '', otp: '' });
  };

  // ── Password login ──────────────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({
        emailOrMobile: form.emailOrMobile,
        password: form.password,
      });
      login(res.data.token, res.data.user);
      toast.success('Welcome back!');
      redirectAfterLogin(res.data.user?.role, router);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── OTP: send ───────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.sendOtp({
        emailOrMobile: form.emailOrMobile,
        purpose: 'login',
      });
      toast.success('OTP sent successfully!');
      setStep(2);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── OTP: verify ─────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({
        emailOrMobile: form.emailOrMobile,
        otp: form.otp,
        purpose: 'login',
      });
      login(res.data.token, res.data.user);
      toast.success('Login successful!');
      redirectAfterLogin(res.data.user?.role, router);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setForm({ ...form, otp: '' });
    try {
      await authApi.sendOtp({ emailOrMobile: form.emailOrMobile, purpose: 'login' });
      toast.success('OTP resent!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-primary-600 font-bold text-xl mb-4">
            <MdBiotech className="text-2xl" /> DiagnosticHub
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode('password')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'password' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => switchMode('otp')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'otp' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            OTP Login
          </button>
        </div>

        {/* ── Password form ── */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Mobile
              </label>
              <input
                name="emailOrMobile"
                type="text"
                required
                value={form.emailOrMobile}
                onChange={handleChange}
                className="input"
                placeholder="you@example.com or 9876543210"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size="sm" />}
              Sign In
            </button>
          </form>
        )}

        {/* ── OTP Step 1: enter email/mobile ── */}
        {mode === 'otp' && step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email or Mobile
              </label>
              <input
                name="emailOrMobile"
                type="text"
                required
                value={form.emailOrMobile}
                onChange={handleChange}
                className="input"
                placeholder="you@example.com or 9876543210"
                autoComplete="username"
              />
            </div>
            <p className="text-xs text-gray-400">
              We&apos;ll send a one-time password to your registered email or mobile.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size="sm" />}
              Send OTP
            </button>
          </form>
        )}

        {/* ── OTP Step 2: enter OTP ── */}
        {mode === 'otp' && step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-900">
              OTP sent to <span className="font-semibold">{form.emailOrMobile}</span>.
              Valid for {process.env.NEXT_PUBLIC_OTP_EXPIRY || 10} minutes.
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                required
                maxLength={6}
                value={form.otp}
                onChange={handleChange}
                className="input text-center text-3xl tracking-[0.5em] font-mono"
                placeholder="000000"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || form.otp.length !== 6}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {loading && <Spinner size="sm" />}
              Verify & Sign In
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-gray-400 hover:text-gray-600"
              >
                ← Change email/mobile
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleResendOtp}
                className="text-primary-600 hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
