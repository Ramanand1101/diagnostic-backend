const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const c = require('../controllers/followUpController');

const admin = [protect, allowRoles('superadmin', 'subadmin', 'lab')];

router.get('/', ...admin, c.list);
router.post('/', ...admin, c.create);
router.put('/:id', ...admin, c.update);
router.delete('/:id', ...admin, c.remove);

module.exports = router;
