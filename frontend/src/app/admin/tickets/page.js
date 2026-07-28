'use client';
import { useState, useEffect } from 'react';
import { ticketApi } from '@/lib/api';
import { formatDate, getErrorMessage } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import toast from 'react-hot-toast';
import { FiSend } from 'react-icons/fi';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

// ── Ticket detail: conversation + reply + status/priority/category management ──
function TicketDetailModal({ ticketId, onClose, onChanged }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');

  const fetchTicket = () => {
    setLoading(true);
    ticketApi.getById(ticketId)
      .then((res) => { setTicket(res.data); setStatus(res.data.status); setPriority(res.data.priority); })
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
      setStatus(res.data.status);
      setReplyText('');
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleStatusSave = async () => {
    setSavingStatus(true);
    try {
      const res = await ticketApi.updateStatus(ticketId, { status, priority });
      setTicket(res.data);
      toast.success('Ticket updated!');
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingStatus(false);
    }
  };

  const closed = ticket && ['resolved', 'closed'].includes(ticket.status);

  return (
    <div className="space-y-4">
      {loading || !ticket ? <PageLoader /> : (
        <>
          <div>
            <p className="text-xs font-mono text-gray-400">{ticket.ticketNo}</p>
            <h4 className="font-semibold text-gray-900">{ticket.subject}</h4>
            <p className="text-sm text-gray-500 mt-0.5">{ticket.user?.name} ({ticket.user?.role}) &bull; {formatDate(ticket.createdAt)}</p>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
            <div className="bg-gray-50 rounded-xl p-3 max-w-[85%]">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.message}</p>
              <p className="text-[10px] text-gray-400 mt-1">{ticket.user?.name || 'Customer'} &bull; {formatDate(ticket.createdAt)}</p>
            </div>
            {(ticket.replies || []).map((r, i) => (
              <div key={i} className={`rounded-xl p-3 max-w-[85%] ${r.isAdmin ? 'bg-primary-50 ml-auto' : 'bg-gray-50'}`}>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">{r.isAdmin ? `${r.repliedByName || r.repliedBy?.name || 'Support'} (Support)` : (r.repliedByName || ticket.user?.name)} &bull; {formatDate(r.createdAt)}</p>
              </div>
            ))}
          </div>

          {closed ? (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 text-center">
              This ticket is {ticket.status.replace('_', ' ')} — reopen it below to reply again.
            </p>
          ) : (
            <form onSubmit={handleReply} className="flex gap-2">
              <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply to customer…" className="input flex-1 text-sm" />
              <button type="submit" disabled={sending || !replyText.trim()} className="btn-primary text-sm px-4 flex items-center gap-1.5 disabled:opacity-50">
                <FiSend size={13} /> {sending ? 'Sending…' : 'Reply'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input text-sm">
                {['low', 'medium', 'high'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn-secondary">Close</button>
            <button onClick={handleStatusSave} disabled={savingStatus} className="btn-primary">{savingStatus ? 'Saving…' : 'Save Status'}</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [openTicketId, setOpenTicketId] = useState(null);
  const limit = 15;

  const fetchTickets = () => {
    setLoading(true);
    const params = { page, limit };
    if (statusFilter) params.status = statusFilter;
    ticketApi.getAll(params)
      .then((res) => {
        setTickets(res.data.items || res.data.tickets || []);
        setTotal(res.data.total || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const priorityColor = { low: 'bg-gray-100 text-gray-600', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <span className="text-xs text-gray-400">{total} total</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setStatusFilter(''); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full ${!statusFilter ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>All</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full capitalize ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{s.replace('_', ' ')}</button>
        ))}
      </div>

      {openTicketId && (
        <Modal open={!!openTicketId} onClose={() => setOpenTicketId(null)} title="Manage Ticket">
          <TicketDetailModal ticketId={openTicketId} onClose={() => setOpenTicketId(null)} onChanged={fetchTickets} />
        </Modal>
      )}

      {loading ? <PageLoader /> : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Ticket #</th>
                  <th className="table-header">Subject</th>
                  <th className="table-header">User</th>
                  <th className="table-header">Latest Reply</th>
                  <th className="table-header">Priority</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-xs">{t.ticketNo}</td>
                    <td className="table-cell font-medium">{t.subject}</td>
                    <td className="table-cell">{t.user?.name || '-'}</td>
                    <td className="table-cell text-sm text-gray-500 max-w-[220px] truncate">{t.latestReply?.message}</td>
                    <td className="table-cell">
                      <span className={`badge text-xs capitalize ${priorityColor[t.priority] || 'bg-gray-100 text-gray-600'}`}>{t.priority}</span>
                    </td>
                    <td className="table-cell"><Badge status={t.status} label={t.status?.replace('_', ' ')} /></td>
                    <td className="table-cell">{formatDate(t.createdAt)}</td>
                    <td className="table-cell">
                      <button onClick={() => setOpenTicketId(t._id)} className="text-primary-600 hover:underline text-sm">Manage</button>
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-10">No tickets found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Pagination page={page} total={total} limit={limit} onPageChange={setPage} />
    </div>
  );
}
