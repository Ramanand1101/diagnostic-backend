const asyncHandler = require('express-async-handler');
const Corporate = require('../models/Corporate');
const CorporateAppointment = require('../models/CorporateAppointment');
const CorporateInvoice = require('../models/CorporateInvoice');
const Counter = require('../models/Counter');

async function nextInvoiceNo() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const seq = await Counter.nextSeq(`corp-invoice-${yyyy}${mm}`, 0);
  return `INV-${yyyy}${mm}-${String(seq).padStart(4, '0')}`;
}

// POST /corporate-invoices/:corporateId/generate — bills all un-invoiced appointments in [from, to]
// whose report is FULLY uploaded (status: 'completed'). A partial report is never billed.
exports.generateInvoice = asyncHandler(async (req, res) => {
  const { from, to } = req.body;
  if (!from || !to) return res.status(400).json({ message: 'from and to dates are required.' });

  const corporate = await Corporate.findById(req.params.corporateId);
  if (!corporate) return res.status(404).json({ message: 'Corporate not found' });

  const filter = {
    corporate: corporate._id,
    status: 'completed',
    invoiced: false,
    createdAt: { $gte: new Date(from + 'T00:00:00.000Z'), $lte: new Date(to + 'T23:59:59.999Z') },
  };

  const appointments = await CorporateAppointment.find(filter).populate('lab', 'name');
  if (!appointments.length) return res.status(400).json({ message: 'No un-invoiced, billable appointments found in this date range.' });

  const lineItems = appointments.map((a) => ({
    appointment: a._id,
    appointmentNo: a.appointmentNo,
    employeeName: a.employee?.name || '',
    date: a.slotDate || a.createdAt,
    description: (a.items || []).map((i) => i.name).join(', ') || a.lab?.name || '',
    amount: a.amount || 0,
  }));

  const subtotal = lineItems.reduce((sum, i) => sum + (i.amount || 0), 0);

  const invoice = await CorporateInvoice.create({
    invoiceNo: await nextInvoiceNo(),
    corporate: corporate._id,
    periodFrom: from,
    periodTo: to,
    appointments: appointments.map((a) => a._id),
    lineItems,
    subtotal,
    tax: 0,
    total: subtotal,
    generatedBy: req.user._id,
  });

  await CorporateAppointment.updateMany({ _id: { $in: appointments.map((a) => a._id) } }, { invoiced: true });

  res.status(201).json(invoice);
});

exports.listInvoices = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.corporate) filter.corporate = req.query.corporate;
  const invoices = await CorporateInvoice.find(filter).populate('corporate', 'companyName').sort('-createdAt');
  res.json({ items: invoices, total: invoices.length });
});

exports.getInvoice = asyncHandler(async (req, res) => {
  const invoice = await CorporateInvoice.findById(req.params.id).populate('corporate');
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json(invoice);
});

exports.updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['draft', 'sent', 'paid'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });
  const invoice = await CorporateInvoice.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  res.json(invoice);
});
