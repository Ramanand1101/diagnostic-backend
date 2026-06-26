const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { memoryUpload } = require('../middleware/uploadMiddleware');
const controller = require('../controllers/reportController');

router.get('/', protect, controller.listReports);
router.post('/', protect, allowRoles('superadmin', 'subadmin', 'lab'), memoryUpload().array('files', 10), controller.uploadReport);
router.get('/share/:token', controller.getSharedReport);
router.get('/:id/download', protect, controller.getDownloadUrl);

module.exports = router;
