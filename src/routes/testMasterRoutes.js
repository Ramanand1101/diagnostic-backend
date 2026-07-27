const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, allowModule } = require('../middleware/authMiddleware');
const c = require('../controllers/testMasterController');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/demo-csv', c.demoCsv);
router.get('/export-csv', protect, allowModule('test-master', 'view'), c.exportCsv);
router.get('/search', c.search);                          // public — used in product form autocomplete
router.get('/', protect, allowModule('test-master', 'view'), c.list);
router.post('/bulk-csv', protect, allowModule('test-master', 'create'), csvUpload.single('file'), c.bulkCsv);
router.post('/', protect, allowModule('test-master', 'create'), c.create);
router.delete('/bulk', protect, allowModule('test-master', 'delete'), c.bulkDelete);
router.put('/:id', protect, allowModule('test-master', 'edit'), c.update);
router.post('/:id/sync-products', protect, allowModule('test-master', 'edit'), c.syncProducts);
router.delete('/:id', protect, allowModule('test-master', 'delete'), c.remove);

module.exports = router;
