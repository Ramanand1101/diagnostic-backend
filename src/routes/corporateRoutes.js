const router = require('express').Router();
const { protect, allowRoles, allowModule } = require('../middleware/authMiddleware');
const corporate = require('../controllers/corporateController');

router.get('/mine', protect, allowRoles('corporate'), corporate.getMyCorporate);

router.get('/', protect, allowModule('corporate', 'view'), corporate.listCorporates);
router.post('/', protect, allowModule('corporate', 'create'), corporate.createCorporate);
router.get('/:id', protect, allowModule('corporate', 'view'), corporate.getCorporate);
router.put('/:id', protect, allowModule('corporate', 'edit'), corporate.updateCorporate);
router.delete('/:id', protect, allowModule('corporate', 'delete'), corporate.deleteCorporate);

router.patch('/:id/status', protect, allowModule('corporate', 'edit'), corporate.setStatus);
router.patch('/:id/labs', protect, allowModule('corporate', 'edit'), corporate.assignLabs);
router.patch('/:id/packages', protect, allowModule('corporate', 'edit'), corporate.assignPackages);
router.patch('/:id/relationship-manager', protect, allowModule('corporate', 'edit'), corporate.assignRelationshipManager);
router.patch('/:id/settings', protect, allowModule('corporate', 'edit'), corporate.updateSettings);

router.post('/:id/account-managers', protect, allowModule('corporate', 'edit'), corporate.addAccountManager);
router.delete('/:id/account-managers/:userId', protect, allowModule('corporate', 'edit'), corporate.removeAccountManager);
router.patch('/:id/account-managers/:userId/hr', protect, allowModule('corporate', 'edit'), corporate.setAccountManagerHR);

router.get('/:id/billing', protect, allowModule('corporate', 'view', 'corporate'), corporate.getBilling);
router.post('/:id/agreements', protect, allowModule('corporate', 'edit'), corporate.addAgreement);

module.exports = router;
