const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { getProfile, updateProfile, listUsers } = require('../controllers/userController');

router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);
router.get('/', protect, allowRoles('superadmin', 'subadmin'), listUsers);

module.exports = router;
