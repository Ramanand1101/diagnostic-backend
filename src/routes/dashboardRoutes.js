const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const { stats } = require('../controllers/dashboardController');

router.get('/stats', protect, allowModule('dashboard', 'view'), stats);

module.exports = router;
