const router = require('express').Router();
const multer = require('multer');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { makePublicUpload } = require('../middleware/uploadMiddleware');
const c = require('../controllers/brandController');

const admin = [protect, allowRoles('superadmin', 'subadmin')];
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const logoUpload = makePublicUpload(process.env.AWS_S3_LOGOS_PREFIX || 'logos/brands');

router.get('/demo-csv', c.demoCsv);
router.get('/by-city', c.byCity);
router.get('/export-csv', ...admin, c.exportCsv);
router.get('/', c.list);
router.post('/upload-logo', ...admin, logoUpload.single('logo'), c.uploadLogo);
router.post('/bulk-csv', ...admin, csvUpload.single('file'), c.bulkCsv);
router.delete('/bulk-delete', ...admin, c.bulkDelete);
router.post('/', ...admin, c.create);
router.put('/:id', ...admin, c.update);
router.patch('/:id/home-collection', ...admin, c.setHomeCollection);
router.delete('/:id', protect, allowRoles('superadmin'), c.remove);

module.exports = router;
