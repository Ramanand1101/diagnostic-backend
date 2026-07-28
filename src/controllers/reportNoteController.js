const asyncHandler = require('express-async-handler');
const ReportNote = require('../models/ReportNote');
const Report = require('../models/Report');
const Booking = require('../models/Booking');

const isAdmin = (role) => role === 'superadmin' || role === 'subadmin';

// Confirms the requesting user owns the booking behind this report (or is an admin,
// who gets read-only access for support purposes — never write access to someone
// else's personal notes).
async function assertReportOwnership(req, reportId) {
  const report = await Report.findById(reportId).select('booking');
  if (!report) return { ok: false, status: 404, message: 'Report not found' };
  if (isAdmin(req.user.role)) return { ok: true, report, readOnly: true };

  const booking = await Booking.findById(report.booking).select('user');
  if (!booking || String(booking.user) !== String(req.user._id)) {
    return { ok: false, status: 403, message: 'You do not have access to this report.' };
  }
  return { ok: true, report, readOnly: false };
}

// GET /api/v1/report-notes?report=<reportId>
exports.list = asyncHandler(async (req, res) => {
  const { report: reportId } = req.query;
  if (!reportId) return res.status(400).json({ message: 'report is required.' });

  const access = await assertReportOwnership(req, reportId);
  if (!access.ok) return res.status(access.status).json({ message: access.message });

  // Admin read-only access sees all notes on the report (support purposes);
  // a customer only ever sees their own (which, for a given report, is the same thing
  // since notes are scoped to the report's owning customer anyway).
  const notes = await ReportNote.find({ report: reportId }).sort('-createdAt');
  res.json({ items: notes });
});

// POST /api/v1/report-notes — body: { report, note }
exports.create = asyncHandler(async (req, res) => {
  const { report: reportId, note } = req.body;
  if (!reportId) return res.status(400).json({ message: 'report is required.' });
  if (!note?.trim()) return res.status(400).json({ message: 'Note text is required.' });

  const access = await assertReportOwnership(req, reportId);
  if (!access.ok) return res.status(access.status).json({ message: access.message });
  if (access.readOnly) return res.status(403).json({ message: 'Admins have read-only access to customer report notes.' });

  const created = await ReportNote.create({ report: reportId, user: req.user._id, note: note.trim() });
  res.status(201).json(created);
});

// PUT /api/v1/report-notes/:id
exports.update = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) return res.status(400).json({ message: 'Note text is required.' });

  const existing = await ReportNote.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Note not found' });
  if (String(existing.user) !== String(req.user._id)) {
    return res.status(403).json({ message: 'You can only edit your own notes.' });
  }

  existing.note = note.trim();
  await existing.save();
  res.json(existing);
});

// DELETE /api/v1/report-notes/:id
exports.remove = asyncHandler(async (req, res) => {
  const existing = await ReportNote.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Note not found' });
  if (String(existing.user) !== String(req.user._id)) {
    return res.status(403).json({ message: 'You can only delete your own notes.' });
  }
  await existing.deleteOne();
  res.json({ message: 'Note deleted' });
});
