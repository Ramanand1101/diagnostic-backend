const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/homeContentController');

router.get('/', controller.getHomeContent);
router.put('/', protect, allowRoles('superadmin', 'subadmin'), controller.updateHomeContent);

module.exports = router;
