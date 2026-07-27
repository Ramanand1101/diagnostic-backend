const router = require('express').Router();
const multer = require('multer');
const { protect, allowModule } = require('../middleware/authMiddleware');
const { makeUpload } = require('../middleware/uploadMiddleware');
const appt = require('../controllers/corporateAppointmentController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const reportUpload = makeUpload(process.env.AWS_S3_CORPORATE_REPORTS_PREFIX || 'corporate-reports');
// 'corporate'/'employee' always pass regardless of the subadmin permissions system —
// ownership/self-service scoping is separately enforced inside the controller (assertAppointmentAccess).
const viewOwn = ['corporate', 'employee'];
const manageOwn = ['corporate'];

router.get('/', protect, allowModule('corporate', 'view', ...viewOwn), appt.listAppointments);
router.get('/export-csv', protect, allowModule('corporate', 'view'), appt.exportCsv);
router.post('/', protect, allowModule('corporate', 'create', ...manageOwn), appt.createAppointment);
router.post('/bulk-upload/:corporateId', protect, allowModule('corporate', 'create'), upload.single('file'), appt.bulkUploadAppointments);
router.get('/:id', protect, allowModule('corporate', 'view', ...viewOwn), appt.getAppointment);

router.patch('/:id/send-to-lab', protect, allowModule('corporate', 'edit'), appt.sendToLab);
router.patch('/:id/confirm', protect, allowModule('corporate', 'edit'), appt.confirmAppointment);
router.patch('/:id/reject', protect, allowModule('corporate', 'edit'), appt.rejectAppointment);
router.patch('/:id/request-alternate', protect, allowModule('corporate', 'edit'), appt.requestAlternate);
router.patch('/:id/reschedule', protect, allowModule('corporate', 'edit', ...viewOwn), appt.rescheduleAppointment);
// Cancel stays corporate/admin-only — the ask for employees was explicitly "view, reschedule, download report"
router.patch('/:id/cancel', protect, allowModule('corporate', 'edit', ...manageOwn), appt.cancelAppointment);
router.post('/:id/notify-employee', protect, allowModule('corporate', 'edit'), appt.notifyEmployee);

router.post('/:id/report', protect, allowModule('corporate', 'edit'), reportUpload.single('file'), appt.uploadReport);
router.patch('/:id/report/mark-done', protect, allowModule('corporate', 'edit'), appt.markReportDone);
router.post('/:id/report/remind', protect, allowModule('corporate', 'edit'), appt.sendReportReminder);
router.get('/:id/report-url', protect, allowModule('corporate', 'view', ...viewOwn), appt.getReportUrl);

module.exports = router;
