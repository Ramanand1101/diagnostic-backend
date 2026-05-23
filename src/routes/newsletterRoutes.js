const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/newsletterController');

router.post('/subscribe', controller.subscribe);
router.get('/', protect, allowRoles('superadmin', 'subadmin'), controller.listSubscribers);

module.exports = router;
