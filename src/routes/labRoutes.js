const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const lab = require('../controllers/labController');

router.get('/', lab.listLabs);
router.get('/nearby', lab.nearbyLabs);
router.get('/compare', lab.compareLabs);
router.get('/:slug', lab.getLabBySlug);
router.post('/', protect, allowRoles('superadmin', 'subadmin', 'lab'), lab.createLab);
router.put('/:id', protect, allowRoles('superadmin', 'subadmin', 'lab'), lab.updateLab);
router.patch('/:id/approve', protect, allowRoles('superadmin'), lab.approveLab);
router.patch('/:id/reject', protect, allowRoles('superadmin'), lab.rejectLab);

module.exports = router;
