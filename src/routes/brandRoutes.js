const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const c = require('../controllers/brandController');

router.get('/', c.list);
router.get('/by-city', c.byCity);
router.post('/', protect, allowRoles('superadmin', 'subadmin'), c.create);
router.put('/:id', protect, allowRoles('superadmin', 'subadmin'), c.update);
router.delete('/:id', protect, allowRoles('superadmin'), c.remove);

module.exports = router;
