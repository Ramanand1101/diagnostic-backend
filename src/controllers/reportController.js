const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');
const Report = require('../models/Report');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Lab = require('../models/Lab');
const { s3, bucket } = require('../config/s3');
const { sendMail } = require('../config/email');

async function compressPdf(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const compressed = await pdfDoc.save({ useObjectStreams: true });
    return Buffer.from(compressed);
  } catch {
    return buffer;
  }
}

exports.uploadReport = asyncHandler(async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) return res.status(400).json({ message: 'At least one PDF file is required' });

  const { booking: bookingId, notes } = req.body;
  if (!bookingId) return res.status(400).json({ message: 'Booking ID is required' });

  const booking = await Booking.findById(bookingId).populate('user lab');
  if (!booking) return res.status(404).json({ message: 'Booking not found' });

  const prefix = process.env.AWS_S3_REPORTS_PREFIX || 'reports';
  const labId = booking.lab?._id || booking.lab;
  const fileStats = [];
  const reports = [];

  for (const file of files) {
    const originalSize = file.buffer.length;
    const compressedBuffer = await compressPdf(file.buffer);
    const fileSize = compressedBuffer.length;

    const safeName = file.originalname.replace(/\s+/g, '_');
    const storageKey = `${prefix}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}`;

    await s3.putObject({
      Bucket: bucket,
      Key: storageKey,
      Body: compressedBuffer,
      ContentType: 'application/pdf',
      ACL: 'private',
      Metadata: {
        bookingId: bookingId.toString(),
        uploadedBy: req.user._id.toString()
      }
    }).promise();

    const report = await Report.create({
      booking: bookingId,
      lab: labId,
      uploadedBy: req.user._id,
      storageKey,
      fileName: file.originalname,
      originalSize,
      fileSize,
      status: 'available',
      sharedToken: crypto.randomBytes(16).toString('hex'),
      notes
    });

    reports.push(report);
    fileStats.push({ name: file.originalname, originalSize, fileSize });
  }

  try {
    const superadmins = await User.find({ role: 'superadmin' }).select('email name');
    if (superadmins.length > 0) {
      const bookingNo = booking.bookingNo || bookingId;
      const labName = booking.lab?.name || 'Lab';
      const customerName = booking.user?.name || 'Customer';

      const fileRows = fileStats.map(({ name, originalSize, fileSize }) => {
        const pct = originalSize > 0 ? Math.round((1 - fileSize / originalSize) * 100) : 0;
        return `<tr>
          <td style="padding:4px 8px;border:1px solid #eee">${name}</td>
          <td style="padding:4px 8px;border:1px solid #eee">${(originalSize / 1024).toFixed(1)} KB</td>
          <td style="padding:4px 8px;border:1px solid #eee">${(fileSize / 1024).toFixed(1)} KB${pct > 0 ? ` (${pct}% saved)` : ''}</td>
        </tr>`;
      }).join('');

      const html = `
        <div style="font-family:sans-serif;max-width:560px">
          <h2 style="color:#0F4C81">${files.length} Report${files.length > 1 ? 's' : ''} Uploaded</h2>
          <p>Test reports have been uploaded and are ready for the customer.</p>
          <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
            <tr><td style="padding:6px 0;color:#666;width:140px"><b>Booking No</b></td><td>#${bookingNo}</td></tr>
            <tr><td style="padding:6px 0;color:#666"><b>Lab</b></td><td>${labName}</td></tr>
            <tr><td style="padding:6px 0;color:#666"><b>Customer</b></td><td>${customerName}</td></tr>
            <tr><td style="padding:6px 0;color:#666"><b>Booking Status</b></td><td>${booking.status}</td></tr>
          </table>
          <table style="border-collapse:collapse;width:100%">
            <thead>
              <tr style="background:#f3f4f6">
                <th style="padding:6px 8px;border:1px solid #eee;text-align:left">File</th>
                <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Original</th>
                <th style="padding:6px 8px;border:1px solid #eee;text-align:left">Compressed</th>
              </tr>
            </thead>
            <tbody>${fileRows}</tbody>
          </table>
        </div>
      `;

      await Promise.allSettled(
        superadmins.map((admin) =>
          sendMail({
            to: admin.email,
            subject: `${files.length} Report${files.length > 1 ? 's' : ''} Uploaded — Booking #${bookingNo}`,
            html
          })
        )
      );
    }
  } catch (emailErr) {
    console.error('Superadmin email notification failed:', emailErr.message);
  }

  res.status(201).json(reports);
});

exports.listReports = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.user.role === 'customer') {
    const myBookings = await Booking.find({ user: req.user._id }).select('_id');
    filter.booking = { $in: myBookings.map((b) => b._id) };
  } else if (req.user.role === 'lab') {
    const myLab = await Lab.findOne({ owners: req.user._id });
    filter.lab = myLab?._id || null;
  } else if (req.query.lab) {
    filter.lab = req.query.lab;
  }

  const reports = await Report.find(filter)
    .populate('booking uploadedBy')
    .sort('-createdAt');

  res.json({ items: reports, total: reports.length });
});

exports.getDownloadUrl = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  if (req.user.role === 'customer') {
    const booking = await Booking.findById(report.booking);
    if (!booking || booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
  } else if (req.user.role === 'lab') {
    const myLab = await Lab.findOne({ owners: req.user._id });
    if (!myLab || !report.lab || report.lab.toString() !== myLab._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
  }

  const url = s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: report.storageKey,
    Expires: 300,
    ResponseContentDisposition: `attachment; filename="${report.fileName || 'report.pdf'}"`
  });

  res.json({ url });
});

exports.getSharedReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({ sharedToken: req.params.token }).populate('booking');
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json(report);
});

// DELETE /api/v1/reports/:id — delete report from S3 + DB
exports.deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  if (report.storageKey) {
    try {
      await s3.deleteObject({ Bucket: bucket, Key: report.storageKey }).promise();
    } catch { /* S3 delete failure should not block DB deletion */ }
  }

  await Report.findByIdAndDelete(req.params.id);
  res.json({ message: 'Report deleted' });
});

// PUT /api/v1/reports/:id/replace — upload a new file to replace an existing report
exports.replaceReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) return res.status(404).json({ message: 'Report not found' });

  const file = req.files?.[0] || req.file;
  if (!file) return res.status(400).json({ message: 'New file required' });

  // Delete old S3 file
  if (report.storageKey) {
    try { await s3.deleteObject({ Bucket: bucket, Key: report.storageKey }).promise(); } catch { /* ignore */ }
  }

  const originalSize = file.buffer.length;
  const compressedBuffer = await compressPdf(file.buffer);
  const fileSize = compressedBuffer.length;
  const prefix = process.env.AWS_S3_REPORTS_PREFIX || 'reports';
  const safeName = file.originalname.replace(/\s+/g, '_');
  const storageKey = `${prefix}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName}`;

  await s3.putObject({
    Bucket: bucket,
    Key: storageKey,
    Body: compressedBuffer,
    ContentType: 'application/pdf',
    ACL: 'private',
  }).promise();

  const updated = await Report.findByIdAndUpdate(
    req.params.id,
    { storageKey, fileName: file.originalname, originalSize, fileSize, status: 'updated' },
    { new: true }
  );

  res.json(updated);
});
