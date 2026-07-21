const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const c = require('../controllers/testMasterController');

const admin = [protect, allowRoles('superadmin', 'subadmin')];
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/demo-csv', c.demoCsv);
router.get('/export-csv', ...admin, c.exportCsv);
router.get('/search', c.search);                          // public — used in product form autocomplete
router.get('/', ...admin, c.list);
router.post('/bulk-csv', ...admin, csvUpload.single('file'), c.bulkCsv);
router.post('/', ...admin, c.create);
router.delete('/bulk', ...admin, c.bulkDelete);
router.put('/:id', ...admin, c.update);
router.delete('/:id', ...admin, c.remove);

module.exports = router;
