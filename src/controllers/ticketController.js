const asyncHandler = require('express-async-handler');
const Ticket = require('../models/Ticket');
const Counter = require('../models/Counter');
const { logActivity } = require('../utils/activityLog');

const isAdmin = (role) => role === 'superadmin' || role === 'subadmin';

async function nextTicketNo() {
  const seq = await Counter.nextSeq('ticket', 1000);
  return `TKT-${seq}`;
}

// Every list response includes a computed `latestReply` — the newest reply if any,
// otherwise the ticket's original message — so the UI can show a "Latest Reply" column
// without the client having to reach into the replies array itself.
function withLatestReply(ticket) {
  const replies = ticket.replies || [];
  const latestReply = replies.length
    ? replies[replies.length - 1]
    : { message: ticket.message, isAdmin: false, createdAt: ticket.createdAt };
  return { ...ticket, latestReply };
}

exports.list = asyncHandler(async (req, res) => {
  const { q, status, category, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (!isAdmin(req.user.role)) filter.user = req.user._id;
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (q) filter.$or = [{ subject: new RegExp(q, 'i') }, { ticketNo: new RegExp(q, 'i') }];

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    Ticket.find(filter).populate('user', 'name email role').sort('-createdAt').skip(skip).limit(safeLimit).lean(),
    Ticket.countDocuments(filter),
  ]);
  res.json({ items: items.map(withLatestReply), page: Number(page), limit: safeLimit, total });
});

exports.getById = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('user', 'name email role')
    .populate('replies.repliedBy', 'name role');
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  if (!isAdmin(req.user.role) && String(ticket.user?._id || ticket.user) !== String(req.user._id)) {
    return res.status(403).json({ message: 'You do not have access to this ticket.' });
  }
  res.json(ticket);
});

exports.create = asyncHandler(async (req, res) => {
  const { subject, message, category, priority } = req.body;
  if (!subject?.trim()) return res.status(400).json({ message: 'Subject is required.' });
  if (!message?.trim()) return res.status(400).json({ message: 'Message is required.' });

  const ticket = await Ticket.create({
    ticketNo: await nextTicketNo(),
    user: req.user._id,
    subject: subject.trim(),
    message: message.trim(),
    category: category || 'general',
    priority: ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
  });
  logActivity({ actor: req.user, action: 'ticket.created', entity: 'Ticket', entityId: ticket._id, description: `${req.user.name} raised ticket ${ticket.ticketNo}: "${ticket.subject}"` });
  res.status(201).json(ticket);
});

// POST /:id/reply — the ticket owner or admin/subadmin can reply, building the
// conversation thread. Blocked once the ticket is resolved/closed.
exports.addReply = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Reply message is required.' });

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  const admin = isAdmin(req.user.role);
  if (!admin && String(ticket.user) !== String(req.user._id)) {
    return res.status(403).json({ message: 'You do not have access to this ticket.' });
  }
  if (['resolved', 'closed'].includes(ticket.status)) {
    return res.status(400).json({ message: `This ticket is ${ticket.status.replace('_', ' ')} and can no longer receive replies.` });
  }

  ticket.replies.push({ message: message.trim(), isAdmin: admin, repliedBy: req.user._id, repliedByName: req.user.name });
  // A support reply moves a brand-new ticket into progress automatically.
  if (admin && ticket.status === 'open') ticket.status = 'in_progress';
  await ticket.save();
  await ticket.populate('replies.repliedBy', 'name role');

  logActivity({ actor: req.user, action: 'ticket.replied', entity: 'Ticket', entityId: ticket._id, description: `${req.user.name} replied to ticket ${ticket.ticketNo}` });
  res.status(201).json(ticket);
});

// PATCH /:id/status — admin-only status/priority/category changes, kept separate
// from the reply flow so a customer reply can never smuggle in a status change.
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, priority, category } = req.body;
  const update = {};
  if (status !== undefined) update.status = status;
  if (priority !== undefined) update.priority = priority;
  if (category !== undefined) update.category = category;

  const ticket = await Ticket.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  logActivity({ actor: req.user, action: 'ticket.status_changed', entity: 'Ticket', entityId: ticket._id, description: `${req.user.name} updated ticket ${ticket.ticketNo} → ${ticket.status}` });
  res.json(ticket);
});

exports.remove = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findByIdAndDelete(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  logActivity({ actor: req.user, action: 'ticket.deleted', entity: 'Ticket', entityId: ticket._id, description: `${req.user.name} deleted ticket ${ticket.ticketNo}` });
  res.json({ message: 'Ticket deleted' });
});
