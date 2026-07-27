const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/homeContentController');

router.get('/', controller.getHomeContent);
router.put('/', protect, allowModule('home-settings', 'edit'), controller.updateHomeContent);

module.exports = router;
