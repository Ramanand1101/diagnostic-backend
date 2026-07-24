const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const corporate = require('../controllers/corporateController');

const adminOnly = allowRoles('superadmin', 'subadmin');

router.get('/mine', protect, allowRoles('corporate'), corporate.getMyCorporate);

router.get('/', protect, adminOnly, corporate.listCorporates);
router.post('/', protect, adminOnly, corporate.createCorporate);
router.get('/:id', protect, adminOnly, corporate.getCorporate);
router.put('/:id', protect, adminOnly, corporate.updateCorporate);
router.delete('/:id', protect, adminOnly, corporate.deleteCorporate);

router.patch('/:id/status', protect, adminOnly, corporate.setStatus);
router.patch('/:id/labs', protect, adminOnly, corporate.assignLabs);
router.patch('/:id/relationship-manager', protect, adminOnly, corporate.assignRelationshipManager);

router.post('/:id/account-managers', protect, adminOnly, corporate.addAccountManager);
router.delete('/:id/account-managers/:userId', protect, adminOnly, corporate.removeAccountManager);

module.exports = router;
