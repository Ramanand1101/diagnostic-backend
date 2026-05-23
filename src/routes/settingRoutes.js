const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/settingController');

router.get('/', protect, allowRoles('superadmin'), controller.list);
router.post('/', protect, allowRoles('superadmin'), controller.create);
router.put('/:id', protect, allowRoles('superadmin'), controller.update);

module.exports = router;
