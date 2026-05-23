const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { makeUpload } = require('../middleware/uploadMiddleware');
const controller = require('../controllers/reportController');

const reportUpload = makeUpload(process.env.AWS_S3_REPORTS_PREFIX || 'reports');

router.get('/', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.listReports);
router.post('/', protect, allowRoles('superadmin', 'subadmin', 'lab'), reportUpload.single('file'), controller.uploadReport);
router.get('/share/:token', controller.getSharedReport);

module.exports = router;
