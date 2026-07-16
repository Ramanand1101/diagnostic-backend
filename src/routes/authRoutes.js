const router = require('express').Router();
const { register, login, me, sendOtp, verifyOtp, googleAuth, autoRegister } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/auto-register', autoRegister);
router.get('/me', protect, me);

module.exports = router;
