const router = require('express').Router();
const multer = require('multer');
const { protect, allowModule } = require('../middleware/authMiddleware');
const c = require('../controllers/testAvailabilityController');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Public — power the customer-facing date picker / cart / booking validation.
router.get('/check', c.checkAvailability);
router.get('/unavailable-dates', c.getUnavailableDates);
router.get('/alternatives', c.suggestAlternativeLabs);

router.get('/demo-csv', protect, allowModule('test-availability', 'view'), c.demoCsv);
router.get('/', protect, allowModule('test-availability', 'view'), c.listRules);
router.post('/', protect, allowModule('test-availability', 'create'), c.createRule);
router.post('/bulk-csv', protect, allowModule('test-availability', 'create'), csvUpload.single('file'), c.bulkUploadCsv);
router.post('/bulk-toggle', protect, allowModule('test-availability', 'edit'), c.bulkToggle);
router.post('/bulk-apply', protect, allowModule('test-availability', 'create'), c.bulkApplyToLabs);
router.put('/:id', protect, allowModule('test-availability', 'edit'), c.updateRule);
router.patch('/:id/toggle', protect, allowModule('test-availability', 'edit'), c.toggleActive);
router.delete('/:id', protect, allowModule('test-availability', 'delete'), c.deleteRule);

module.exports = router;
