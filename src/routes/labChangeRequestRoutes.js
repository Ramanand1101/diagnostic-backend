const router = require('express').Router();
const { protect, allowRoles, allowModule } = require('../middleware/authMiddleware');
const c = require('../controllers/labChangeRequestController');

router.post('/',        protect, allowRoles('lab'), c.submit);
router.get('/mine',     protect, allowRoles('lab'), c.getMine);
router.get('/',         protect, allowModule('lab-changes', 'view'), c.list);
router.patch('/:id/approve', protect, allowModule('lab-changes', 'edit'), c.approve);
router.patch('/:id/reject',  protect, allowModule('lab-changes', 'edit'), c.reject);

module.exports = router;
