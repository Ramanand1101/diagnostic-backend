'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { newsletterApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { FiMail, FiBell } from 'react-icons/fi';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await newsletterApi.subscribe({ email });
      toast.success('Subscribed successfully!');
      setEmail('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white border-t border-gray-100 py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-14 h-14 bg-secondary-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <FiBell className="text-secondary-500 text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Stay Healthy, Stay Informed</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Get personalized health tips, test reminders, and exclusive offers delivered straight to your inbox.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <div className="flex-1 relative">
            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-secondary-400 text-gray-900 placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-secondary-500 hover:bg-secondary-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-60 text-sm flex-shrink-0"
          >
            {loading ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4">No spam, ever. Unsubscribe anytime.</p>
      </div>
    </section>
  );
}
