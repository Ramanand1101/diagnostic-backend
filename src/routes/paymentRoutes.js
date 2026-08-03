const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const controller = require('../controllers/paymentController');

// Both scoped to req.user inside the controller (never trust a client-supplied booking
// list blindly) — no special permission module needed, mirrors booking creation's own
// auth model (any authenticated customer can pay for their own bookings).
router.post('/razorpay/order', protect, controller.createOrder);
router.post('/razorpay/verify', protect, controller.verifyPayment);

module.exports = router;
