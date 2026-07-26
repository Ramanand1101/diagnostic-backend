const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/integrationSettingController');

// Credential management is sensitive enough to restrict to superadmin only (not subadmin)
const superAdminOnly = allowRoles('superadmin');

router.get('/', protect, superAdminOnly, ctrl.listIntegrations);
router.put('/:key', protect, superAdminOnly, ctrl.upsertIntegration);
router.delete('/:key', protect, superAdminOnly, ctrl.deleteIntegration);

module.exports = router;
