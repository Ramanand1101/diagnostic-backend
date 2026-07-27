const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const { memoryUpload } = require('../middleware/uploadMiddleware');
const controller = require('../controllers/reportController');

router.get('/', protect, controller.listReports);
router.post('/', protect, allowModule('reports', 'create', 'lab'), memoryUpload().array('files', 10), controller.uploadReport);
router.get('/share/:token', controller.getSharedReport);
router.get('/:id/download', protect, controller.getDownloadUrl);
router.put('/:id/replace', protect, allowModule('reports', 'edit', 'lab'), memoryUpload().array('files', 1), controller.replaceReport);
router.delete('/:id', protect, allowModule('reports', 'delete'), controller.deleteReport);

module.exports = router;
