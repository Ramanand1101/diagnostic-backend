const router = require('express').Router();
const multer = require('multer');
const { protect, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/categoryController');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/demo-csv', controller.demoCsv);
router.get('/tree', controller.tree);
router.get('/', controller.list);
router.get('/:slug', controller.getBySlug);
router.post('/bulk-csv', protect, allowModule('categories', 'create'), csvUpload.single('file'), controller.bulkCsv);
router.post('/', protect, allowModule('categories', 'create'), controller.create);
router.put('/:id', protect, allowModule('categories', 'edit'), controller.update);
router.delete('/:id', protect, allowModule('categories', 'delete'), controller.remove);

module.exports = router;
