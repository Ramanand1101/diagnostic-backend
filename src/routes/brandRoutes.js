const router = require('express').Router();
const multer = require('multer');
const { protect, allowModule } = require('../middleware/authMiddleware');
const { makePublicUpload } = require('../middleware/uploadMiddleware');
const c = require('../controllers/brandController');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const logoUpload = makePublicUpload(process.env.AWS_S3_LOGOS_PREFIX || 'logos/brands');

router.get('/demo-csv', c.demoCsv);
router.get('/by-city', c.byCity);
router.get('/export-csv', protect, allowModule('brands', 'view'), c.exportCsv);
router.get('/', c.list);
router.post('/upload-logo', protect, allowModule('brands', ['create', 'edit']), logoUpload.single('logo'), c.uploadLogo);
router.post('/bulk-csv', protect, allowModule('brands', 'create'), csvUpload.single('file'), c.bulkCsv);
router.delete('/bulk-delete', protect, allowModule('brands', 'delete'), c.bulkDelete);
router.post('/', protect, allowModule('brands', 'create'), c.create);
router.put('/:id', protect, allowModule('brands', 'edit'), c.update);
router.patch('/:id/home-collection', protect, allowModule('brands', 'edit'), c.setHomeCollection);
router.delete('/:id', protect, allowModule('brands', 'delete'), c.remove);

module.exports = router;
