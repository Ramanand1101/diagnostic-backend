const router = require('express').Router();
const multer = require('multer');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const c = require('../controllers/brandController');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/demo-csv', c.demoCsv);
router.get('/by-city', c.byCity);
router.get('/', c.list);
router.post('/bulk-csv', protect, allowRoles('superadmin', 'subadmin'), csvUpload.single('file'), c.bulkCsv);
router.post('/', protect, allowRoles('superadmin', 'subadmin'), c.create);
router.put('/:id', protect, allowRoles('superadmin', 'subadmin'), c.update);
router.delete('/:id', protect, allowRoles('superadmin'), c.remove);

module.exports = router;
