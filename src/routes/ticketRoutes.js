const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/ticketController');

router.get('/', protect, allowModule('tickets', 'view'), controller.list);
router.get('/:id', protect, allowModule('tickets', 'view'), controller.getById);
router.post('/', protect, controller.create);
router.put('/:id', protect, allowModule('tickets', 'edit'), controller.update);
router.delete('/:id', protect, allowModule('tickets', 'delete'), controller.remove);

module.exports = router;
