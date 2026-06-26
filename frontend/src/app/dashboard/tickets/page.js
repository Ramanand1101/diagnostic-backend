'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ticketApi } from '@/lib/api';
import { formatDate, statusColor, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiMessageSquare } from 'react-icons/fi';

export default function CustomerTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '', category: 'general', priority: 'medium' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = () => {
    setLoading(true);
    ticketApi.getAll({ limit: 50 })
      .then((res) => setTickets(res.data.items || res.data.tickets || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ticketApi.create(form);
      toast.success('Ticket submitted!');
      setModal(false);
      setForm({ subject: '', message: '', category: 'general', priority: 'medium' });
      fetchTickets();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus /> New Ticket
        </button>
      </div>

      {loading ? (
        <PageLoader />
      ) : tickets.length === 0 ? (
        <div className="card text-center py-16">
          <FiMessageSquare className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tickets yet</p>
          <p className="text-sm text-gray-400 mt-1">Submit a ticket if you need help with a booking or report</p>
          <button onClick={() => setModal(true)} className="btn-primary text-sm mt-4 inline-flex items-center gap-2">
            <FiPlus /> Create Ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t._id} className="card flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                t.priority === 'high' ? 'bg-red-50 text-red-500' :
                t.priority === 'medium' ? 'bg-yellow-50 text-yellow-500' :
                'bg-gray-50 text-gray-400'
              }`}>
                <FiMessageSquare />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium text-gray-900 truncate">{t.subject}</p>
                  <Badge status={t.status} label={t.status?.replace('_', ' ')} />
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{t.message}</p>
                <p className="text-xs text-gray-400 mt-2">{formatDate(t.createdAt)} &bull; {t.category} &bull; {t.priority} priority</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New Support Ticket">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                <option value="general">General</option>
                <option value="booking">Booking</option>
                <option value="report">Report</option>
                <option value="payment">Payment</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input" placeholder="Brief summary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="input" placeholder="Describe your issue..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Submitting...' : 'Submit Ticket'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
