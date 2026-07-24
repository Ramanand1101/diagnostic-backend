const router = require('express').Router();
const multer = require('multer');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { makeUpload } = require('../middleware/uploadMiddleware');
const appt = require('../controllers/corporateAppointmentController');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const reportUpload = makeUpload(process.env.AWS_S3_CORPORATE_REPORTS_PREFIX || 'corporate-reports');
const adminOrCorporate = allowRoles('superadmin', 'subadmin', 'corporate');
const adminOnly = allowRoles('superadmin', 'subadmin');

router.get('/', protect, adminOrCorporate, appt.listAppointments);
router.post('/', protect, adminOrCorporate, appt.createAppointment);
router.post('/bulk-upload/:corporateId', protect, adminOnly, upload.single('file'), appt.bulkUploadAppointments);
router.get('/:id', protect, adminOrCorporate, appt.getAppointment);

router.patch('/:id/send-to-lab', protect, adminOnly, appt.sendToLab);
router.patch('/:id/confirm', protect, adminOnly, appt.confirmAppointment);
router.patch('/:id/reject', protect, adminOnly, appt.rejectAppointment);
router.patch('/:id/request-alternate', protect, adminOnly, appt.requestAlternate);
router.patch('/:id/reschedule', protect, adminOrCorporate, appt.rescheduleAppointment);
router.patch('/:id/cancel', protect, adminOrCorporate, appt.cancelAppointment);
router.post('/:id/notify-employee', protect, adminOnly, appt.notifyEmployee);

router.post('/:id/report', protect, adminOnly, reportUpload.single('file'), appt.uploadReport);
router.get('/:id/report-url', protect, adminOrCorporate, appt.getReportUrl);

module.exports = router;
