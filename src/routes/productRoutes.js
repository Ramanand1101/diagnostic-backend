const router = require('express').Router();
const multer = require('multer');
const { protect, allowRoles, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/productController');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', controller.listProducts);
router.get('/admin', protect, allowModule('products', 'view'), controller.adminListProducts);
router.get('/export-csv', protect, allowModule('products', 'view'), controller.exportCsv);
router.get('/demo-csv', controller.productDemoCsv);
router.get('/lab-demo-csv', protect, allowRoles('lab'), controller.labDemoCsv);
router.post('/bulk-tests', protect, allowModule('products', 'create'), controller.bulkUploadTests);
router.post('/migrate-testmaster', protect, allowRoles('superadmin'), controller.migrateTestMaster);
router.post('/bulk-csv', protect, allowModule('products', 'create'), csvUpload.single('file'), controller.bulkUploadProductsCsv);
router.post('/lab-bulk-csv', protect, allowRoles('lab'), csvUpload.single('file'), controller.labBulkCsv);
router.delete('/bulk-delete', protect, allowModule('products', 'delete'), controller.bulkDeleteProducts);
router.patch('/bulk-price', protect, allowModule('products', 'edit'), controller.bulkUpdatePrice);
router.get('/:slug', controller.getProductBySlug);
router.post('/', protect, allowModule('products', 'create', 'lab'), controller.createProduct);
router.patch('/:id/set-price', protect, allowRoles('lab'), controller.setPrice);
router.put('/:id', protect, allowModule('products', 'edit', 'lab'), controller.updateProduct);
router.delete('/:id', protect, allowModule('products', 'delete', 'lab'), controller.deleteProduct);

module.exports = router;
