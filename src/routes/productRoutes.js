const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/productController');

router.get('/', controller.listProducts);
router.post('/bulk-tests', protect, allowRoles('superadmin', 'subadmin'), controller.bulkUploadTests);
router.get('/:slug', controller.getProductBySlug);
router.post('/', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.createProduct);
router.put('/:id', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.updateProduct);
router.delete('/:id', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.deleteProduct);

module.exports = router;

