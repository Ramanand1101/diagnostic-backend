const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/newsletterController');

router.post('/subscribe', controller.subscribe);
router.get('/', protect, allowRoles('superadmin', 'subadmin'), controller.listSubscribers);
router.delete('/bulk-delete', protect, allowRoles('superadmin', 'subadmin'), controller.bulkDelete);
router.patch('/:id/toggle', protect, allowRoles('superadmin', 'subadmin'), controller.toggleSubscription);
router.delete('/:id', protect, allowRoles('superadmin', 'subadmin'), controller.deleteSubscriber);

module.exports = router;
