const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const inv = require('../controllers/corporateInvoiceController');

const adminOnly = allowRoles('superadmin', 'subadmin');

router.get('/', protect, adminOnly, inv.listInvoices);
router.post('/:corporateId/generate', protect, adminOnly, inv.generateInvoice);
router.get('/:id', protect, adminOnly, inv.getInvoice);
router.patch('/:id/status', protect, adminOnly, inv.updateInvoiceStatus);

module.exports = router;
