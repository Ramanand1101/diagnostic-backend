'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { authApi, userApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getErrorMessage } from '@/utils/helpers';
import HealthOnTimeLogo from '@/components/layout/HealthOnTimeLogo';
import { FiPhone, FiX, FiSmartphone } from 'react-icons/fi';
import { RiWhatsappLine } from 'react-icons/ri';
import Spinner from '@/components/ui/Spinner';

// ── Phone number collection modal (shown after Google sign-in if no mobile) ──
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
      await refreshUser();
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

function redirectAfterLogin(role, router, redirectTo) {
  if (redirectTo && redirectTo.startsWith('/')) { router.push(redirectTo); return; }
  router.push(role === 'superadmin' || role === 'subadmin' ? '/admin' : '/dashboard');
}

// ── Channel pill button ───────────────────────────────────────────────────────
function ChannelBtn({ active, onClick, icon: Icon, label, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
        active
          ? `${color} border-current`
          : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
      }`}
    >
      <Icon className="text-base" /> {label}
    </button>
  );
}

function LoginContent() {
  const [mode, setMode] = useState('password'); // 'password' | 'otp'
  const [channel, setChannel] = useState('sms'); // 'sms' | 'whatsapp'
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ emailOrMobile: '', password: '', otp: '' });
  const [loading, setLoading] = useState(false);
  const [phoneModal, setPhoneModal] = useState(null);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '';

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const switchMode = (m) => {
    setMode(m);
    setStep(1);
    setForm({ emailOrMobile: form.emailOrMobile, password: '', otp: '' });
  };

  // ── Password login ──────────────────────────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ emailOrMobile: form.emailOrMobile, password: form.password });
      login(res.data.token, res.data.user);
      toast.success('Welcome back!');
      redirectAfterLogin(res.data.user?.role, router, redirectTo);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── OTP: send ───────────────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    // Validate 10-digit mobile
    if (!/^[6-9]\d{9}$/.test(form.emailOrMobile)) {
      toast.error('Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp({ emailOrMobile: form.emailOrMobile, purpose: 'login', channel });
      const via = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
      toast.success(`OTP sent via ${via}!`);
      setStep(2);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── OTP: verify ─────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ emailOrMobile: form.emailOrMobile, otp: form.otp, purpose: 'login' });
      login(res.data.token, res.data.user);
      toast.success('Login successful!');
      redirectAfterLogin(res.data.user?.role, router, redirectTo);
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
      await authApi.sendOtp({ emailOrMobile: form.emailOrMobile, purpose: 'login', channel });
      const via = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
      toast.success(`OTP resent via ${via}!`);
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
      toast.success('Welcome!');
      if (!res.data.user?.mobile) {
        setPhoneModal({ role: res.data.user?.role });
      } else {
        redirectAfterLogin(res.data.user?.role, router, redirectTo);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const finishGoogleLogin = () => {
    redirectAfterLogin(phoneModal?.role, router, redirectTo);
    setPhoneModal(null);
  };

  const channelLabel = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';

  return (
    <>
      {phoneModal && <PhoneModal onSave={finishGoogleLogin} onSkip={finishGoogleLogin} />}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex mb-4">
              <HealthOnTimeLogo showTagline />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
          </div>

          {/* Google Sign-In */}
          <div className="mb-5 flex flex-col items-center gap-3">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign-in failed')}
              width="368"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
            />
            <div className="flex items-center w-full gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or continue with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </div>

          {/* Mode toggle: Password | OTP */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email or Mobile</label>
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
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {loading && <Spinner size="sm" />} Sign In
              </button>
            </form>
          )}

          {/* ── OTP Step 1: mobile + channel choice ── */}
          {mode === 'otp' && step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                  <span className="px-3 py-2.5 bg-gray-50 border-r border-gray-300 text-sm text-gray-500 font-medium">+91</span>
                  <input
                    name="emailOrMobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                    value={form.emailOrMobile}
                    onChange={(e) => setForm({ ...form, emailOrMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent"
                    placeholder="98765 43210"
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* Channel: SMS or WhatsApp */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Send OTP via</label>
                <div className="flex gap-3">
                  <ChannelBtn
                    active={channel === 'sms'}
                    onClick={() => setChannel('sms')}
                    icon={FiSmartphone}
                    label="Phone SMS"
                    color="bg-blue-50 text-blue-600"
                  />
                  <ChannelBtn
                    active={channel === 'whatsapp'}
                    onClick={() => setChannel('whatsapp')}
                    icon={RiWhatsappLine}
                    label="WhatsApp"
                    color="bg-green-50 text-green-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || form.emailOrMobile.length !== 10}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading && <Spinner size="sm" />}
                Send OTP via {channelLabel}
              </button>
            </form>
          )}

          {/* ── OTP Step 2: enter OTP ── */}
          {mode === 'otp' && step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* Delivery info banner */}
              <div className={`flex items-start gap-3 rounded-xl p-3.5 text-sm ${
                channel === 'whatsapp'
                  ? 'bg-green-50 border border-green-100 text-green-800'
                  : 'bg-blue-50 border border-blue-100 text-blue-800'
              }`}>
                {channel === 'whatsapp'
                  ? <RiWhatsappLine className="text-lg mt-0.5 flex-shrink-0" />
                  : <FiSmartphone className="text-lg mt-0.5 flex-shrink-0" />
                }
                <span>
                  OTP sent via <strong>{channelLabel}</strong> to{' '}
                  <strong>+91 {form.emailOrMobile}</strong>.{' '}
                  Valid for {process.env.NEXT_PUBLIC_OTP_EXPIRY || 10} minutes.
                </span>
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
                Verify &amp; Sign In
              </button>

              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => setStep(1)} className="text-gray-400 hover:text-gray-600">
                  ← Change number
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
            <Link href="/register" className="text-primary-600 font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
