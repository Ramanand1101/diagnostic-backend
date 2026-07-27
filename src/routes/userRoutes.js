const router = require('express').Router();
const { protect, allowRoles, allowModule } = require('../middleware/authMiddleware');
const { getProfile, updateProfile, listUsers, changePassword, deleteUser, updateRole, updateUserDetails, bulkDeleteUsers, exportCsv, updatePermissions, listPermissionModules, createUser, resetPassword } = require('../controllers/userController');

router.get('/me', protect, getProfile);
router.put('/me', protect, updateProfile);
router.put('/me/change-password', protect, changePassword);
router.get('/permission-modules', protect, allowRoles('superadmin'), listPermissionModules);
router.post('/', protect, allowModule('users', 'create'), createUser);
router.get('/', protect, allowModule('users', 'view'), listUsers);
router.patch('/:id/role', protect, allowModule('users', 'edit'), updateRole);
router.patch('/:id', protect, allowModule('users', 'edit'), updateUserDetails);
router.get('/export-csv', protect, allowModule('users', 'view'), exportCsv);
router.patch('/:id/permissions', protect, allowRoles('superadmin'), updatePermissions);
router.delete('/bulk-delete', protect, allowRoles('superadmin'), bulkDeleteUsers);
router.post('/:id/reset-password', protect, allowModule('users', 'edit'), resetPassword);
router.delete('/:id', protect, allowRoles('superadmin'), deleteUser);

module.exports = router;
