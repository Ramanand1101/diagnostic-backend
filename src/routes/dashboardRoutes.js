const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { stats } = require('../controllers/dashboardController');

router.get('/stats', protect, allowRoles('superadmin', 'subadmin'), stats);

module.exports = router;
