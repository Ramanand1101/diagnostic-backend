const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const controller = require('../controllers/reviewController');

router.get('/', controller.listReviews);
router.post('/', protect, controller.createReview);

module.exports = router;
