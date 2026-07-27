const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const inv = require('../controllers/corporateInvoiceController');

router.get('/', protect, allowModule('corporate', 'view'), inv.listInvoices);
router.get('/export-csv', protect, allowModule('corporate', 'view'), inv.exportCsv);
router.post('/:corporateId/generate', protect, allowModule('corporate', 'create'), inv.generateInvoice);
router.get('/:id', protect, allowModule('corporate', 'view'), inv.getInvoice);
router.patch('/:id/status', protect, allowModule('corporate', 'edit'), inv.updateInvoiceStatus);

module.exports = router;
