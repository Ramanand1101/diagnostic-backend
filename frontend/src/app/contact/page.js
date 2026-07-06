'use client';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ticketApi, newsletterApi } from '@/lib/api';
import { getErrorMessage } from '@/utils/helpers';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Spinner from '@/components/ui/Spinner';
import { FiMail, FiPhone, FiMapPin, FiMessageSquare } from 'react-icons/fi';

export default function ContactPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to submit a support ticket');
      return;
    }
    setLoading(true);
    try {
      await ticketApi.create(form);
      setSubmitted(true);
      toast.success('Your message has been sent!');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    { icon: FiMail, label: 'Email', value: 'support@diagnostichub.com' },
    { icon: FiPhone, label: 'Phone', value: '+91 98765 43210' },
    { icon: FiMapPin, label: 'Address', value: 'Mumbai, Maharashtra, India' },
  ];

  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
          <p className="text-gray-500 mt-2">Have a question or need help? We&apos;re here for you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact info */}
          <div className="space-y-6">
            {contactInfo.map(({ icon: Icon, label, value }) => (
              <div key={label} className="card flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="text-lg" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-gray-900">{value}</p>
                </div>
              </div>
            ))}

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Business Hours</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Monday – Friday</span>
                  <span>9:00 AM – 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span>10:00 AM – 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="text-red-500">Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-2 card">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiMessageSquare className="text-2xl" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h2>
                <p className="text-gray-500">Our team will get back to you within 24 hours.</p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ subject: '', message: '', category: 'general', priority: 'medium' }); }}
                  className="btn-primary mt-6"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-semibold text-gray-900 mb-6 text-lg">Send a Message</h2>
                {!user && (
                  <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-3 rounded-lg mb-4">
                    Please <Link href="/login" className="font-medium underline">login</Link> to submit a support ticket and track your request.
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="input"
                      >
                        <option value="general">General Enquiry</option>
                        <option value="booking">Booking Issue</option>
                        <option value="report">Report Issue</option>
                        <option value="payment">Payment Issue</option>
                        <option value="lab">Lab Complaint</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value })}
                        className="input"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High – Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                    <input
                      required
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="input"
                      placeholder="Brief description of your issue"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                    <textarea
                      required
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="input"
                      placeholder="Please describe your issue in detail..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex items-center gap-2 py-3 px-8"
                  >
                    {loading && <Spinner size="sm" />}
                    Send Message
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
