const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { listActivity } = require('../controllers/activityLogController');

router.get('/', protect, allowRoles('superadmin', 'subadmin'), listActivity);

module.exports = router;
