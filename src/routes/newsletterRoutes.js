const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/newsletterController');

router.post('/subscribe', controller.subscribe);
router.get('/', protect, allowModule('newsletter', 'view'), controller.listSubscribers);
router.delete('/bulk-delete', protect, allowModule('newsletter', 'delete'), controller.bulkDelete);
router.patch('/:id/toggle', protect, allowModule('newsletter', 'edit'), controller.toggleSubscription);
router.delete('/:id', protect, allowModule('newsletter', 'delete'), controller.deleteSubscriber);

module.exports = router;
