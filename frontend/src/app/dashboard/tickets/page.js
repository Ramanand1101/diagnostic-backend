'use client';
import { useState, useEffect } from 'react';
import { ticketApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { FiPlus, FiMessageSquare, FiSend } from 'react-icons/fi';

// ── Conversation / reply modal ────────────────────────────────────────────────
function TicketDetailModal({ ticketId, onClose, onChanged }) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTicket = () => {
    setLoading(true);
    ticketApi.getById(ticketId)
      .then((res) => setTicket(res.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTicket(); }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await ticketApi.reply(ticketId, replyText.trim());
      setTicket(res.data);
      setReplyText('');
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const closed = ticket && ['resolved', 'closed'].includes(ticket.status);

  return (
    <div className="space-y-4">
      {loading || !ticket ? <PageLoader /> : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-mono text-gray-400">{ticket.ticketNo}</p>
              <h3 className="font-semibold text-gray-900">{ticket.subject}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(ticket.createdAt)} &bull; {ticket.category} &bull; {ticket.priority} priority</p>
            </div>
            <Badge status={ticket.status} label={ticket.status?.replace('_', ' ')} />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
            {/* Original message */}
            <div className="bg-gray-50 rounded-xl p-3 max-w-[85%]">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
              <p className="text-[10px] text-gray-400 mt-1">{user?.name || 'You'} &bull; {formatDate(ticket.createdAt)}</p>
            </div>
            {/* Replies */}
            {(ticket.replies || []).map((r, i) => (
              <div key={i} className={`rounded-xl p-3 max-w-[85%] ${r.isAdmin ? 'bg-primary-50 ml-auto' : 'bg-gray-50'}`}>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">{r.isAdmin ? `${r.repliedByName || 'HealthOnTime Support'} (Support)` : (r.repliedByName || 'You')} &bull; {formatDate(r.createdAt)}</p>
              </div>
            ))}
          </div>

          {closed ? (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 text-center">
              This ticket is {ticket.status} and can no longer receive replies.
            </p>
          ) : (
            <form onSubmit={handleReply} className="flex gap-2 pt-1">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply…"
                className="input flex-1 text-sm"
              />
              <button type="submit" disabled={sending || !replyText.trim()} className="btn-primary text-sm px-4 flex items-center gap-1.5 disabled:opacity-50">
                <FiSend size={13} /> {sending ? 'Sending…' : 'Reply'}
              </button>
            </form>
          )}

          <div className="flex justify-end">
            <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function CustomerTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [openTicketId, setOpenTicketId] = useState(null);
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
      const res = await ticketApi.create(form);
      toast.success(`Ticket ${res.data.ticketNo} submitted!`);
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
      {openTicketId && (
        <Modal open={!!openTicketId} onClose={() => setOpenTicketId(null)} title="Support Ticket">
          <TicketDetailModal ticketId={openTicketId} onClose={() => setOpenTicketId(null)} onChanged={fetchTickets} />
        </Modal>
      )}

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
            <button
              key={t._id}
              onClick={() => setOpenTicketId(t._id)}
              className="card flex items-start gap-4 w-full text-left hover:border-primary-200 hover:shadow-sm transition-all"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                t.priority === 'high' ? 'bg-red-50 text-red-500' :
                t.priority === 'medium' ? 'bg-yellow-50 text-yellow-500' :
                'bg-gray-50 text-gray-400'
              }`}>
                <FiMessageSquare />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-mono text-gray-400">{t.ticketNo}</p>
                    <p className="font-medium text-gray-900 truncate">{t.subject}</p>
                  </div>
                  <Badge status={t.status} label={t.status?.replace('_', ' ')} />
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                  <span className="text-gray-400">{t.latestReply?.isAdmin ? 'Support: ' : ''}</span>
                  {t.latestReply?.message || t.message}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  {formatDate(t.createdAt)} &bull; {t.category} &bull; {t.priority} priority
                  {t.latestReply?.createdAt && t.latestReply.createdAt !== t.createdAt && (
                    <> &bull; last reply {formatDate(t.latestReply.createdAt)}</>
                  )}
                </p>
              </div>
            </button>
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
