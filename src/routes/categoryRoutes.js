const router = require('express').Router();
const multer = require('multer');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/categoryController');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/demo-csv', controller.demoCsv);
router.get('/tree', controller.tree);
router.get('/', controller.list);
router.get('/:slug', controller.getBySlug);
router.post('/bulk-csv', protect, allowRoles('superadmin', 'subadmin'), csvUpload.single('file'), controller.bulkCsv);
router.post('/', protect, allowRoles('superadmin', 'subadmin'), controller.create);
router.put('/:id', protect, allowRoles('superadmin', 'subadmin'), controller.update);
router.delete('/:id', protect, allowRoles('superadmin', 'subadmin'), controller.remove);

module.exports = router;
