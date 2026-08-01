const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/couponController');

router.get('/active', controller.listActive);
router.post('/validate', protect, controller.validate);
router.get('/', protect, allowModule('coupons', 'view'), controller.list);
router.get('/:id', protect, allowModule('coupons', 'view'), controller.getById);
router.post('/', protect, allowModule('coupons', 'create'), controller.create);
router.put('/:id', protect, allowModule('coupons', 'edit'), controller.update);
router.delete('/:id', protect, allowModule('coupons', 'delete'), controller.remove);

module.exports = router;
