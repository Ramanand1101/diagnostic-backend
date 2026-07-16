const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/categoryController');

router.get('/tree', controller.tree);
router.get('/', controller.list);
router.get('/:slug', controller.getBySlug);
router.post('/', protect, allowRoles('superadmin', 'subadmin'), controller.create);
router.put('/:id', protect, allowRoles('superadmin', 'subadmin'), controller.update);
router.delete('/:id', protect, allowRoles('superadmin', 'subadmin'), controller.remove);

module.exports = router;
