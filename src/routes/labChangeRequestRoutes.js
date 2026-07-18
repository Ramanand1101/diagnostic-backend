const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const c = require('../controllers/labChangeRequestController');

const admin = [protect, allowRoles('superadmin', 'subadmin')];

router.post('/',        protect, allowRoles('lab'), c.submit);
router.get('/mine',     protect, allowRoles('lab'), c.getMine);
router.get('/',         ...admin, c.list);
router.patch('/:id/approve', ...admin, c.approve);
router.patch('/:id/reject',  ...admin, c.reject);

module.exports = router;
