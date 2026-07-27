const asyncHandler = require('express-async-handler');
const CorporateAppointment = require('../models/CorporateAppointment');
const CorporatePackage = require('../models/CorporatePackage');
const Corporate = require('../models/Corporate');
const Lab = require('../models/Lab');
const User = require('../models/User');
const Counter = require('../models/Counter');
const { queueEmail } = require('../queues/index');
const { sendWhatsapp } = require('../config/sms');
const { parseSpreadsheet } = require('../utils/csvParser');
const { logActivity } = require('../utils/activityLog');
const { emailDomain } = require('../utils/validators');

// Employee emails must match one of the corporate's configured Allowed Email Domain(s).
// Returns an error message string, or null if the email is missing/valid.
function checkEmployeeDomain(corporate, email) {
  if (!email) return null;
  const domains = (corporate.domains || []).filter(Boolean).map((d) => d.toLowerCase().trim());
  if (domains.length && !domains.includes(emailDomain(email))) {
    return `Employee email must use one of this corporate's allowed domains: ${domains.join(', ')}`;
  }
  return null;
}

async function nextAppointmentNo() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const seq = await Counter.nextSeq(`corp-appt-${dd}${mm}${yyyy}`, 0);
  return `CORP-${dd}${mm}${yyyy}-${String(seq).padStart(4, '0')}`;
}

// Resolves the caller's own Corporate doc when they log in as a 'corporate' user;
// admins pass/see any corporate via req.body.corporate / req.query.corporate.
async function resolveCorporateScope(req) {
  if (req.user.role === 'corporate') {
    return Corporate.findOne({ owners: req.user._id });
  }
  return null;
}

// Returns false (and sends a 403) if a 'corporate'/'employee' role user is trying to touch
// an appointment that isn't theirs. Admins (superadmin/subadmin) are always allowed. The error
// middleware here keys off res.statusCode rather than a custom err.status, so this sets
// the status directly rather than throwing.
async function assertAppointmentAccess(req, res, appointment) {
  if (req.user.role === 'employee') {
    const appointmentEmployeeUserId = appointment.employeeUser?._id || appointment.employeeUser;
    if (!appointmentEmployeeUserId || String(appointmentEmployeeUserId) !== String(req.user._id)) {
      res.status(403).json({ message: 'You do not have access to this appointment.' });
      return false;
    }
    return true;
  }
  if (req.user.role !== 'corporate') return true;
  const myCorporate = await Corporate.findOne({ owners: req.user._id }).select('_id');
  const appointmentCorporateId = appointment.corporate?._id || appointment.corporate;
  if (!myCorporate || String(appointmentCorporateId) !== String(myCorporate._id)) {
    res.status(403).json({ message: 'You do not have access to this appointment.' });
    return false;
  }
  return true;
}

// Finds or creates a self-service ('employee' role) login for an appointment's employee,
// so they can log in to view/reschedule this appointment and download their report.
// Never hijacks an existing account that belongs to a different role (customer/lab/admin/etc).
async function getOrCreateEmployeeUser({ name, email, phone }) {
  if (!email) return null;
  const existing = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
  if (existing) return existing.role === 'employee' ? existing : null;

  const rand = Math.floor(1000 + Math.random() * 9000);
  const tempPassword = `Emp@${rand}`;
  const user = await User.create({ name: name || 'Employee', email, mobile: phone || undefined, role: 'employee', password: tempPassword });

  try {
    await queueEmail({
      to: email,
      subject: 'Your HealthOnTime account — view your appointment & report',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1d4ed8">Welcome, ${user.name}!</h2>
          <p>A diagnostic appointment has been scheduled for you through your employer. You can log in to view its status, reschedule, and download your report once ready.</p>
          <p><strong>Login Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong>
            <span style="font-size:1.3rem;font-weight:700;letter-spacing:2px;color:#111">${tempPassword}</span>
          </p>
          <p style="color:#dc2626;font-size:0.9rem">⚠ Please change your password after logging in.</p>
          <a href="${process.env.FRONTEND_URL || 'https://healthontime.in'}/login"
            style="display:inline-block;margin-top:1rem;background:#1d4ed8;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Login Now →
          </a>
        </div>`,
    });
  } catch (e) {
    console.error('[CorporateAppointment] employee welcome email failed:', e.message);
  }

  return user;
}

async function itemsFromPackage(corporate, packageId) {
  const pkg = await CorporatePackage.findById(packageId);
  if (!pkg) throw Object.assign(new Error('Package not found'), { status: 400 });
  const assignment = (corporate.packages || []).find((p) => String(p.package) === String(packageId));
  if (!assignment) throw Object.assign(new Error('This package is not assigned to the corporate.'), { status: 400 });
  return {
    items: pkg.items.map((i) => ({ name: i.name, price: i.price })),
    price: assignment.price,
  };
}

exports.createAppointment = asyncHandler(async (req, res) => {
  const myCorporate = await resolveCorporateScope(req);
  if (req.user.role === 'corporate' && !myCorporate) {
    return res.status(403).json({ message: 'Your account is not linked to a corporate.' });
  }
  const corporateId = myCorporate ? myCorporate._id : req.body.corporate;
  if (!corporateId) return res.status(400).json({ message: 'corporate is required.' });

  const corporate = myCorporate || await Corporate.findById(corporateId);
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  if (!corporate.active) return res.status(403).json({ message: 'This corporate account is suspended.' });

  const { employee, lab: labId, package: packageId, items, slotDate, slotTime, notes } = req.body;
  if (!employee?.name) return res.status(400).json({ message: 'Employee name is required.' });
  if (!labId) return res.status(400).json({ message: 'Lab is required.' });

  const domainError = checkEmployeeDomain(corporate, employee.email);
  if (domainError) return res.status(400).json({ message: domainError });

  const isAssigned = (corporate.assignedLabs || []).some((l) => String(l) === String(labId));
  if (!isAssigned) return res.status(403).json({ message: 'This lab is not assigned to the corporate. Ask admin to assign it first.' });

  const lab = await Lab.findById(labId);
  if (!lab) return res.status(404).json({ message: 'Lab not found' });

  let finalItems = items || [];
  let amount = 0;
  if (packageId) {
    let resolved;
    try {
      resolved = await itemsFromPackage(corporate, packageId);
    } catch (err) {
      return res.status(err.status || 400).json({ message: err.message });
    }
    finalItems = resolved.items;
    amount = resolved.price;
  } else {
    amount = finalItems.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
  }

  const employeeUser = await getOrCreateEmployeeUser(employee).catch((e) => {
    console.error('[CorporateAppointment] employee account link failed:', e.message);
    return null;
  });

  const appointment = await CorporateAppointment.create({
    appointmentNo: await nextAppointmentNo(),
    corporate: corporate._id,
    employee,
    employeeUser: employeeUser?._id || null,
    lab: lab._id,
    package: packageId || null,
    items: finalItems,
    amount,
    slotDate,
    slotTime,
    city: lab.city,
    state: lab.state,
    notes,
    source: 'manual',
    createdBy: req.user._id,
  });

  logActivity({ actor: req.user, action: 'appointment.created', entity: 'CorporateAppointment', entityId: appointment._id, description: `${req.user.name} scheduled appointment ${appointment.appointmentNo} for ${employee?.name} at ${lab.name}`, payload: { corporate: corporate._id } });
  res.status(201).json(appointment);
});

// POST /corporate-appointments/bulk-upload/:corporateId — Excel/CSV bulk scheduling
// Expected columns: employeename, employeeemail, employeephone, employeeid, lab (name), package (name, optional), slotdate, slottime, notes
exports.bulkUploadAppointments = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File is required (CSV or XLSX).' });

  const corporate = await Corporate.findById(req.params.corporateId)
    .populate('assignedLabs', 'name city state')
    .populate('packages.package', 'name items');
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
  if (!corporate.active) return res.status(403).json({ message: 'This corporate account is suspended.' });

  const { rows } = parseSpreadsheet(req.file);
  if (!rows.length) return res.status(400).json({ message: 'File has no data rows.' });

  const created = [];
  const errors = [];

  for (const [i, row] of rows.entries()) {
    try {
      if (!row.employeename) { errors.push({ row: i + 2, error: 'employeename is required' }); continue; }
      if (!row.lab) { errors.push({ row: i + 2, error: 'lab is required' }); continue; }

      const lab = corporate.assignedLabs.find((l) => l.name.toLowerCase() === row.lab.toLowerCase());
      if (!lab) { errors.push({ row: i + 2, error: `Lab "${row.lab}" is not assigned to this corporate` }); continue; }

      let finalItems = [];
      let packageId = null;
      let amount = 0;
      if (row.package) {
        const match = corporate.packages.find((p) => p.package?.name?.toLowerCase() === row.package.toLowerCase());
        if (!match) { errors.push({ row: i + 2, error: `Package "${row.package}" is not assigned to this corporate` }); continue; }
        finalItems = match.package.items.map((it) => ({ name: it.name, price: it.price }));
        packageId = match.package._id;
        amount = match.price;
      }

      const employeeInfo = {
        name: row.employeename,
        email: row.employeeemail || '',
        phone: row.employeephone || '',
        employeeId: row.employeeid || '',
      };
      const domainError = checkEmployeeDomain(corporate, employeeInfo.email);
      if (domainError) { errors.push({ row: i + 2, error: domainError }); continue; }

      const employeeUser = await getOrCreateEmployeeUser(employeeInfo).catch((e) => {
        console.error('[CorporateAppointment] employee account link failed:', e.message);
        return null;
      });

      const appointment = await CorporateAppointment.create({
        appointmentNo: await nextAppointmentNo(),
        corporate: corporate._id,
        employee: employeeInfo,
        employeeUser: employeeUser?._id || null,
        lab: lab._id,
        package: packageId,
        items: finalItems,
        amount,
        slotDate: row.slotdate ? new Date(row.slotdate) : undefined,
        slotTime: row.slottime || '',
        city: row.city || lab.city,
        state: row.state || lab.state,
        notes: row.notes || '',
        source: 'excel',
        createdBy: req.user._id,
      });
      created.push(appointment._id);
    } catch (err) {
      errors.push({ row: i + 2, error: err.message });
    }
  }

  res.json({ created: created.length, errors, total: rows.length });
});

exports.listAppointments = asyncHandler(async (req, res) => {
  const myCorporate = await resolveCorporateScope(req);
  const { status, lab, corporate, dateFrom, dateTo, q, page = 1, limit = 20 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 500);
  const filter = {};

  if (req.user.role === 'employee') {
    // Employees only ever see appointments explicitly linked to their own login
    filter.employeeUser = req.user._id;
  } else if (req.user.role === 'corporate') {
    // Always scope to the caller's own corporate — never trust a client-supplied ?corporate=
    filter.corporate = myCorporate ? myCorporate._id : null;
  } else if (corporate) {
    filter.corporate = corporate;
  }

  if (status) filter.status = status;
  if (lab) filter.lab = lab;
  if (dateFrom || dateTo) {
    filter.slotDate = {};
    if (dateFrom) filter.slotDate.$gte = new Date(dateFrom);
    if (dateTo) filter.slotDate.$lte = new Date(dateTo);
  }
  if (q) filter.$or = [{ appointmentNo: new RegExp(q, 'i') }, { 'employee.name': new RegExp(q, 'i') }];

  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    CorporateAppointment.find(filter)
      .populate('corporate', 'companyName')
      .populate('lab', 'name city phone email')
      .populate('package', 'name')
      .sort('-createdAt').skip(skip).limit(safeLimit),
    CorporateAppointment.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});

// GET /corporate-appointments/export-csv — admin: bulk download filtered appointments
exports.exportCsv = asyncHandler(async (req, res) => {
  const { status, lab, corporate, dateFrom, dateTo, q } = req.query;
  const filter = {};
  if (corporate) filter.corporate = corporate;
  if (status) filter.status = status;
  if (lab) filter.lab = lab;
  if (dateFrom || dateTo) {
    filter.slotDate = {};
    if (dateFrom) filter.slotDate.$gte = new Date(dateFrom);
    if (dateTo) filter.slotDate.$lte = new Date(dateTo);
  }
  if (q) filter.$or = [{ appointmentNo: new RegExp(q, 'i') }, { 'employee.name': new RegExp(q, 'i') }];

  const items = await CorporateAppointment.find(filter)
    .populate('corporate', 'companyName')
    .populate('lab', 'name city')
    .sort('-createdAt')
    .limit(10000)
    .lean();

  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const headers = [
    'appointmentNo', 'corporate', 'employeeName', 'employeeEmail', 'employeePhone', 'employeeId',
    'lab', 'city', 'tests', 'amount', 'slotDate', 'slotTime', 'status', 'reportStatus',
    'missingTests', 'invoiced', 'createdAt',
  ];

  const rows = items.map((a) => [
    a.appointmentNo, a.corporate?.companyName || '', a.employee?.name || '', a.employee?.email || '', a.employee?.phone || '', a.employee?.employeeId || '',
    a.lab?.name || '', a.city || '', (a.items || []).map((i) => i.name).join('|'), a.amount || 0,
    a.slotDate ? new Date(a.slotDate).toISOString().slice(0, 10) : '', a.slotTime || '', a.status, a.reportStatus || 'none',
    (a.missingTests || []).join('|'), a.invoiced ? 'Yes' : 'No',
    a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : '',
  ].map(escape).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="corporate-appointments-export.csv"');
  res.send(csv);
});

exports.getAppointment = asyncHandler(async (req, res) => {
  const appointment = await CorporateAppointment.findById(req.params.id)
    .populate('corporate', 'companyName email phone')
    .populate('lab', 'name city phone email address')
    .populate('package', 'name');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (!(await assertAppointmentAccess(req, res, appointment))) return;
  res.json(appointment);
});

// PATCH /:id/send-to-lab — notifies the lab of the appointment request
exports.sendToLab = asyncHandler(async (req, res) => {
  const appointment = await CorporateAppointment.findById(req.params.id).populate('lab corporate');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

  appointment.status = 'sent_to_lab';
  await appointment.save();

  if (appointment.lab?.email) {
    const itemsList = appointment.items.map((i) => `<li>${i.name}</li>`).join('');
    try {
      await queueEmail({
        to: appointment.lab.email,
        subject: `New Corporate Appointment Request — ${appointment.appointmentNo}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#1d4ed8">New Appointment Request</h2>
            <p>Corporate: <strong>${appointment.corporate?.companyName}</strong></p>
            <p>Employee: <strong>${appointment.employee?.name}</strong> (${appointment.employee?.phone || ''})</p>
            <p>Date: ${appointment.slotDate ? new Date(appointment.slotDate).toDateString() : 'TBD'} ${appointment.slotTime || ''}</p>
            <p>Tests:</p><ul>${itemsList}</ul>
            <p>Please confirm availability with HealthOnTime admin.</p>
          </div>`,
      });
    } catch (e) {
      console.error('[CorporateAppointment] send-to-lab email failed:', e.message);
    }
  }

  res.json(appointment);
});

// PATCH /:id/confirm
exports.confirmAppointment = asyncHandler(async (req, res) => {
  const appointment = await CorporateAppointment.findByIdAndUpdate(
    req.params.id,
    { status: 'confirmed' },
    { new: true }
  ).populate('lab corporate package');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  logActivity({ actor: req.user, action: 'appointment.confirmed', entity: 'CorporateAppointment', entityId: appointment._id, description: `${req.user.name} confirmed appointment ${appointment.appointmentNo}` });
  res.json(appointment);
});

// PATCH /:id/reject
exports.rejectAppointment = asyncHandler(async (req, res) => {
  const appointment = await CorporateAppointment.findByIdAndUpdate(
    req.params.id,
    { status: 'rejected' },
    { new: true }
  );
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  logActivity({ actor: req.user, action: 'appointment.rejected', entity: 'CorporateAppointment', entityId: appointment._id, description: `${req.user.name} rejected appointment ${appointment.appointmentNo}` });
  res.json(appointment);
});

// PATCH /:id/request-alternate — lab can't accommodate; ask corporate for an alternate date or lab
exports.requestAlternate = asyncHandler(async (req, res) => {
  const { type, note } = req.body;
  if (!['date', 'lab'].includes(type)) return res.status(400).json({ message: 'type must be "date" or "lab".' });

  const appointment = await CorporateAppointment.findByIdAndUpdate(
    req.params.id,
    { status: 'alternate_requested', alternateRequest: { type, note, requestedAt: new Date() } },
    { new: true }
  ).populate('corporate');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

  const corp = appointment.corporate;
  if (corp?.email) {
    try {
      await queueEmail({
        to: corp.email,
        subject: `Alternate ${type === 'date' ? 'Date' : 'Lab'} Requested — ${appointment.appointmentNo}`,
        html: `<p>The lab could not confirm appointment <strong>${appointment.appointmentNo}</strong> as scheduled.</p>
          <p>Please provide an alternate ${type === 'date' ? 'date/time' : 'lab'}.${note ? ` Note: ${note}` : ''}</p>`,
      });
    } catch (e) {
      console.error('[CorporateAppointment] request-alternate email failed:', e.message);
    }
  }

  res.json(appointment);
});

// PATCH /:id/reschedule — same or different lab/hospital at a different date/time
exports.rescheduleAppointment = asyncHandler(async (req, res) => {
  const { slotDate, slotTime, lab: newLabId, reason } = req.body;
  const appointment = await CorporateAppointment.findById(req.params.id).populate('corporate');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (!(await assertAppointmentAccess(req, res, appointment))) return;

  let newLab = appointment.lab;
  if (newLabId && String(newLabId) !== String(appointment.lab)) {
    if (req.user.role === 'employee') {
      return res.status(403).json({ message: 'Employees cannot change the lab. Please contact your account manager.' });
    }
    const corporate = appointment.corporate;
    const isAssigned = (corporate.assignedLabs || []).some((l) => String(l) === String(newLabId));
    if (!isAssigned) return res.status(403).json({ message: 'This lab is not assigned to the corporate.' });
    const labDoc = await Lab.findById(newLabId);
    if (!labDoc) return res.status(404).json({ message: 'Lab not found' });
    newLab = labDoc._id;
    appointment.city = labDoc.city;
    appointment.state = labDoc.state;
  }

  appointment.rescheduleHistory.push({
    fromDate: appointment.slotDate,
    fromTime: appointment.slotTime,
    fromLab: appointment.lab,
    toDate: slotDate || appointment.slotDate,
    toTime: slotTime || appointment.slotTime,
    toLab: newLab,
    reason,
    changedBy: req.user._id,
  });

  if (slotDate) appointment.slotDate = slotDate;
  if (slotTime) appointment.slotTime = slotTime;
  appointment.lab = newLab;
  appointment.status = 'pending'; // needs re-confirmation from the lab
  await appointment.save();

  logActivity({ actor: req.user, action: 'appointment.rescheduled', entity: 'CorporateAppointment', entityId: appointment._id, description: `${req.user.name} rescheduled appointment ${appointment.appointmentNo}${reason ? ` — ${reason}` : ''}` });
  res.json(appointment);
});

// PATCH /:id/cancel
exports.cancelAppointment = asyncHandler(async (req, res) => {
  const existing = await CorporateAppointment.findById(req.params.id).select('corporate');
  if (!existing) return res.status(404).json({ message: 'Appointment not found' });
  if (!(await assertAppointmentAccess(req, res, existing))) return;

  const appointment = await CorporateAppointment.findByIdAndUpdate(
    req.params.id,
    { status: 'cancelled', cancelledBy: req.user._id, cancelledAt: new Date(), cancelReason: req.body.reason || '' },
    { new: true }
  );
  logActivity({ actor: req.user, action: 'appointment.cancelled', entity: 'CorporateAppointment', entityId: appointment._id, description: `${req.user.name} cancelled appointment ${appointment.appointmentNo}${req.body.reason ? ` — ${req.body.reason}` : ''}` });
  res.json(appointment);
});

// POST /:id/notify-employee — send current appointment status to the employee via email/whatsapp
exports.notifyEmployee = asyncHandler(async (req, res) => {
  const channels = Array.isArray(req.body.channels) ? req.body.channels : ['email'];
  const appointment = await CorporateAppointment.findById(req.params.id).populate('lab corporate');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

  const emp = appointment.employee || {};
  const dateStr = appointment.slotDate ? new Date(appointment.slotDate).toDateString() : 'TBD';
  const statusText = {
    confirmed: 'confirmed',
    pending: 'rescheduled and is pending lab confirmation',
    alternate_requested: 'awaiting an alternate date/lab',
    rejected: 'not available at this lab — please contact HR',
    cancelled: 'cancelled',
    completed: 'complete — your report has been uploaded',
  }[appointment.status] || appointment.status;

  const message = `Hi ${emp.name}, your appointment ${appointment.appointmentNo} at ${appointment.lab?.name || 'the lab'} on ${dateStr}${appointment.slotTime ? ` at ${appointment.slotTime}` : ''} is ${statusText}.`;

  const results = { email: false, whatsapp: false };

  if (channels.includes('email') && emp.email) {
    try {
      await queueEmail({
        to: emp.email,
        subject: `Appointment ${appointment.appointmentNo} — ${statusText}`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto"><p>${message}</p></div>`,
      });
      results.email = true;
    } catch (e) { console.error('[CorporateAppointment] notify email failed:', e.message); }
  }

  if (channels.includes('whatsapp') && emp.phone) {
    try {
      await sendWhatsapp({ to: emp.phone, message });
      results.whatsapp = true;
    } catch (e) { console.error('[CorporateAppointment] notify whatsapp failed:', e.message); }
  }

  appointment.confirmationSentAt = new Date();
  appointment.confirmationChannels = Object.keys(results).filter((k) => results[k]);
  await appointment.save();

  res.json({ message: 'Notification attempted', results });
});

// POST /:id/report — upload a test report file (multer-s3 middleware puts the S3 key on req.file.key)
// Only allowed once the lab has confirmed the appointment.
// body.type: 'complete' (default) marks the appointment completed & billable;
// body.type: 'partial' keeps it pending completion, records which tests are still missing,
// and emails the lab asking for the rest — it does NOT unlock billing.
exports.uploadReport = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File is required.' });

  const existing = await CorporateAppointment.findById(req.params.id).populate('lab', 'name email');
  if (!existing) return res.status(404).json({ message: 'Appointment not found' });
  if (!['confirmed', 'completed'].includes(existing.status)) {
    return res.status(400).json({ message: 'Report can only be uploaded after the appointment is confirmed.' });
  }

  const type = req.body.type === 'partial' ? 'partial' : 'complete';
  let missingTests = [];
  if (type === 'partial') {
    try {
      missingTests = JSON.parse(req.body.missingTests || '[]');
    } catch {
      missingTests = String(req.body.missingTests || '').split(',').map((s) => s.trim()).filter(Boolean);
    }
    if (!missingTests.length) return res.status(400).json({ message: 'List which tests are still missing for a partial report.' });
  }

  existing.reportKey = req.file.key;
  existing.reportFileName = req.file.originalname;
  existing.reportUploadedAt = new Date();
  existing.reportUploadedBy = req.user._id;
  existing.reportStatus = type;
  existing.missingTests = type === 'partial' ? missingTests : [];
  if (type === 'complete') existing.status = 'completed';
  await existing.save();

  if (type === 'partial' && existing.lab?.email) {
    try {
      await queueEmail({
        to: existing.lab.email,
        subject: `Partial Report Received — ${existing.appointmentNo} — tests still pending`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#b45309">Partial Report Received</h2>
            <p>We received a partial report for appointment <strong>${existing.appointmentNo}</strong> (${existing.employee?.name || ''}).</p>
            <p>The following test(s) are still pending — please send the remaining report at the earliest:</p>
            <ul>${missingTests.map((t) => `<li>${t}</li>`).join('')}</ul>
          </div>`,
      });
    } catch (e) {
      console.error('[CorporateAppointment] partial-report lab email failed:', e.message);
    }
  }

  logActivity({ actor: req.user, action: type === 'partial' ? 'report.uploaded_partial' : 'report.uploaded_complete', entity: 'CorporateAppointment', entityId: existing._id, description: `${req.user.name} uploaded a ${type} report for ${existing.appointmentNo}${type === 'partial' ? ` (missing: ${missingTests.join(', ')})` : ''}` });
  res.json(existing);
});

// PATCH /:id/report/mark-done — admin confirms the previously-uploaded report is now complete
// (e.g. the missing tests arrived separately). This is what unlocks billing for the appointment.
exports.markReportDone = asyncHandler(async (req, res) => {
  const appointment = await CorporateAppointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (!appointment.reportKey) return res.status(400).json({ message: 'No report has been uploaded yet.' });
  if (appointment.reportStatus === 'complete') return res.status(400).json({ message: 'Report is already marked complete.' });

  appointment.reportStatus = 'complete';
  appointment.missingTests = [];
  appointment.status = 'completed';
  await appointment.save();
  logActivity({ actor: req.user, action: 'report.marked_done', entity: 'CorporateAppointment', entityId: appointment._id, description: `${req.user.name} marked the report for ${appointment.appointmentNo} as complete` });
  res.json(appointment);
});

// POST /:id/report/remind — admin manually re-nudges the lab about tests still missing
// from a partial report (the automatic email only fires once, at upload time)
exports.sendReportReminder = asyncHandler(async (req, res) => {
  const appointment = await CorporateAppointment.findById(req.params.id).populate('lab', 'name email');
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (appointment.reportStatus !== 'partial') {
    return res.status(400).json({ message: 'This appointment does not have a partial report awaiting completion.' });
  }
  if (!appointment.missingTests?.length) {
    return res.status(400).json({ message: 'No missing tests are recorded for this appointment.' });
  }
  if (!appointment.lab?.email) {
    return res.status(400).json({ message: 'This lab has no email address on file to send a reminder to.' });
  }

  await queueEmail({
    to: appointment.lab.email,
    subject: `Reminder: Report still pending — ${appointment.appointmentNo}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#b45309">Reminder — Report Still Pending</h2>
        <p>This is a follow-up reminder for appointment <strong>${appointment.appointmentNo}</strong> (${appointment.employee?.name || ''}).</p>
        <p>The following test(s) are still pending — please send the remaining report at the earliest:</p>
        <ul>${appointment.missingTests.map((t) => `<li>${t}</li>`).join('')}</ul>
      </div>`,
  });

  appointment.reportReminderSentAt = new Date();
  await appointment.save();

  logActivity({ actor: req.user, action: 'report.reminder_sent', entity: 'CorporateAppointment', entityId: appointment._id, description: `${req.user.name} sent a manual reminder to ${appointment.lab.name} about missing tests (${appointment.missingTests.join(', ')}) for ${appointment.appointmentNo}` });
  res.json(appointment);
});

// GET /:id/report-url — short-lived signed download URL for the uploaded report
exports.getReportUrl = asyncHandler(async (req, res) => {
  const appointment = await CorporateAppointment.findById(req.params.id);
  if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
  if (!(await assertAppointmentAccess(req, res, appointment))) return;
  if (!appointment.reportKey) return res.status(404).json({ message: 'No report uploaded for this appointment yet.' });

  if (req.user.role === 'employee') {
    const corp = await Corporate.findById(appointment.corporate).select('settings.employeeCanDownloadReport');
    if (corp?.settings?.employeeCanDownloadReport === false) {
      return res.status(403).json({ message: 'Report downloads are disabled for employees on this account. Please contact your HR/account manager.' });
    }
  }

  const { s3, bucket } = require('../config/s3');
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

  const url = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: bucket,
    Key: appointment.reportKey,
    ResponseContentDisposition: `attachment; filename="${appointment.reportFileName || 'report.pdf'}"`,
  }), { expiresIn: 300 });

  res.json({ url });
});
