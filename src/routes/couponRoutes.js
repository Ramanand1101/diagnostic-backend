const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/couponController');

router.get('/', protect, allowRoles('superadmin', 'subadmin'), controller.list);
router.get('/:id', protect, allowRoles('superadmin', 'subadmin'), controller.getById);
router.post('/', protect, allowRoles('superadmin', 'subadmin'), controller.create);
router.put('/:id', protect, allowRoles('superadmin', 'subadmin'), controller.update);
router.delete('/:id', protect, allowRoles('superadmin', 'subadmin'), controller.remove);

module.exports = router;
