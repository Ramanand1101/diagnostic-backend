const router = require('express').Router();
const multer = require('multer');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/productController');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', controller.listProducts);
router.get('/admin', protect, allowRoles('superadmin', 'subadmin'), controller.adminListProducts);
router.get('/demo-csv', controller.productDemoCsv);
router.post('/bulk-tests', protect, allowRoles('superadmin', 'subadmin'), controller.bulkUploadTests);
router.post('/bulk-csv', protect, allowRoles('superadmin', 'subadmin'), csvUpload.single('file'), controller.bulkUploadProductsCsv);
router.delete('/bulk-delete', protect, allowRoles('superadmin', 'subadmin'), controller.bulkDeleteProducts);
router.patch('/bulk-price', protect, allowRoles('superadmin', 'subadmin'), controller.bulkUpdatePrice);
router.get('/:slug', controller.getProductBySlug);
router.post('/', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.createProduct);
router.put('/:id', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.updateProduct);
router.delete('/:id', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.deleteProduct);

module.exports = router;
