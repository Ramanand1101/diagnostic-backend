const express = require('express');
const router = express.Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const c = require('../controllers/leadController');

router.get('/', protect, allowModule('crm', 'view', 'lab'), c.list);
router.post('/', protect, allowModule('crm', 'create', 'lab'), c.create);
router.put('/:id', protect, allowModule('crm', 'edit', 'lab'), c.update);
router.patch('/:id/convert', protect, allowModule('crm', 'edit', 'lab'), c.convert);
router.delete('/:id', protect, allowModule('crm', 'delete', 'lab'), c.remove);

module.exports = router;
