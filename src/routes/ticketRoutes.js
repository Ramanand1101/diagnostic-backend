const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/ticketController');

// Any self-service role always passes — ownership scoping (own tickets only) is
// enforced inside the controller. Subadmins still need 'tickets' permission granted.
const SELF_ROLES = ['customer', 'lab', 'corporate', 'employee', 'hot_employee'];

router.get('/', protect, allowModule('tickets', 'view', ...SELF_ROLES), controller.list);
router.get('/:id', protect, allowModule('tickets', 'view', ...SELF_ROLES), controller.getById);
router.post('/', protect, controller.create);
router.post('/:id/reply', protect, allowModule('tickets', 'edit', ...SELF_ROLES), controller.addReply);
router.patch('/:id/status', protect, allowModule('tickets', 'edit'), controller.updateStatus);
router.delete('/:id', protect, allowModule('tickets', 'delete'), controller.remove);

module.exports = router;
