const router = require('express').Router();
const multer = require('multer');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { makeUpload } = require('../middleware/uploadMiddleware');
const appt = require('../controllers/corporateAppointmentController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const reportUpload = makeUpload(process.env.AWS_S3_CORPORATE_REPORTS_PREFIX || 'corporate-reports');
const adminOrCorporate = allowRoles('superadmin', 'subadmin', 'corporate');
// Read/self-manage access — includes employees viewing/rescheduling/downloading only their own appointment
const viewOrManageOwn = allowRoles('superadmin', 'subadmin', 'corporate', 'employee');
const adminOnly = allowRoles('superadmin', 'subadmin');

router.get('/', protect, viewOrManageOwn, appt.listAppointments);
router.get('/export-csv', protect, adminOnly, appt.exportCsv);
router.post('/', protect, adminOrCorporate, appt.createAppointment);
router.post('/bulk-upload/:corporateId', protect, adminOnly, upload.single('file'), appt.bulkUploadAppointments);
router.get('/:id', protect, viewOrManageOwn, appt.getAppointment);

router.patch('/:id/send-to-lab', protect, adminOnly, appt.sendToLab);
router.patch('/:id/confirm', protect, adminOnly, appt.confirmAppointment);
router.patch('/:id/reject', protect, adminOnly, appt.rejectAppointment);
router.patch('/:id/request-alternate', protect, adminOnly, appt.requestAlternate);
router.patch('/:id/reschedule', protect, viewOrManageOwn, appt.rescheduleAppointment);
// Cancel stays corporate/admin-only — the ask for employees was explicitly "view, reschedule, download report"
router.patch('/:id/cancel', protect, adminOrCorporate, appt.cancelAppointment);
router.post('/:id/notify-employee', protect, adminOnly, appt.notifyEmployee);

router.post('/:id/report', protect, adminOnly, reportUpload.single('file'), appt.uploadReport);
router.patch('/:id/report/mark-done', protect, adminOnly, appt.markReportDone);
router.get('/:id/report-url', protect, viewOrManageOwn, appt.getReportUrl);

module.exports = router;
