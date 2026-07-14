'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiX } from 'react-icons/fi';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = localStorage.getItem('cookie_consent');
    if (!choice) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto bg-gray-900 text-white rounded-2xl shadow-2xl border border-gray-700 px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">

        {/* Icon + Text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0 mt-0.5">🍪</span>
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">We use cookies</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              We use cookies to improve your experience, analyze traffic, and personalize content.
              By clicking <span className="text-white font-medium">"Accept All"</span>, you agree to our{' '}
              <Link href="/cookie-policy" className="text-primary-400 hover:text-primary-300 underline underline-offset-2">
                Cookie Policy
              </Link>.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 sm:flex-col sm:gap-2 lg:flex-row">
          <button
            onClick={decline}
            className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="flex-1 sm:flex-none text-xs font-semibold px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors"
          >
            Accept All
          </button>
        </div>

        {/* Close (X) */}
        <button
          onClick={decline}
          className="absolute top-3 right-3 sm:static text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <FiX className="text-base" />
        </button>
      </div>
    </div>
  );
}
