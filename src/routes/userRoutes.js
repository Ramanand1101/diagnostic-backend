const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { getProfile, updateProfile, listUsers, changePassword, deleteUser, updateRole, bulkDeleteUsers } = require('../controllers/userController');

router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);
router.put('/me/change-password', protect, changePassword);
router.get('/', protect, allowRoles('superadmin', 'subadmin'), listUsers);
router.patch('/:id/role', protect, allowRoles('superadmin', 'subadmin'), updateRole);
router.delete('/bulk-delete', protect, allowRoles('superadmin'), bulkDeleteUsers);
router.delete('/:id', protect, allowRoles('superadmin'), deleteUser);

module.exports = router;
