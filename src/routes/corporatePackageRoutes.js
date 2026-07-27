const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const pkg = require('../controllers/corporatePackageController');

router.get('/', protect, allowModule('corporate', 'view'), pkg.listPackages);
router.post('/', protect, allowModule('corporate', 'create'), pkg.createPackage);
router.get('/:id', protect, allowModule('corporate', 'view'), pkg.getPackage);
router.put('/:id', protect, allowModule('corporate', 'edit'), pkg.updatePackage);
router.delete('/:id', protect, allowModule('corporate', 'delete'), pkg.deletePackage);

module.exports = router;
