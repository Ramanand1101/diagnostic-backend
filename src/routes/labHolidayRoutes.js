const router = require('express').Router();
const multer = require('multer');
const { protect, allowModule } = require('../middleware/authMiddleware');
const c = require('../controllers/labHolidayController');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/demo-csv', protect, allowModule('lab-holidays', 'view'), c.demoCsv);
router.get('/blocked-dates', c.getBlockedDates); // public — powers the customer-facing date picker
router.get('/', protect, allowModule('lab-holidays', 'view'), c.listHolidays);
router.post('/', protect, allowModule('lab-holidays', 'create'), c.createHoliday);
router.post('/bulk-csv', protect, allowModule('lab-holidays', 'create'), csvUpload.single('file'), c.bulkUploadCsv);
router.put('/:id', protect, allowModule('lab-holidays', 'edit'), c.updateHoliday);
router.patch('/:id/toggle', protect, allowModule('lab-holidays', 'edit'), c.toggleActive);
router.delete('/:id', protect, allowModule('lab-holidays', 'delete'), c.deleteHoliday);

module.exports = router;
