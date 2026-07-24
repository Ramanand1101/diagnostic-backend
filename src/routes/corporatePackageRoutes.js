const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const pkg = require('../controllers/corporatePackageController');

const adminOnly = allowRoles('superadmin', 'subadmin');

router.get('/', protect, adminOnly, pkg.listPackages);
router.post('/', protect, adminOnly, pkg.createPackage);
router.get('/:id', protect, adminOnly, pkg.getPackage);
router.put('/:id', protect, adminOnly, pkg.updatePackage);
router.delete('/:id', protect, adminOnly, pkg.deletePackage);

module.exports = router;
