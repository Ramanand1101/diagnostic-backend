const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const { listActivity } = require('../controllers/activityLogController');

router.get('/', protect, allowModule('activity-log', 'view'), listActivity);

module.exports = router;
