const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const c = require('../controllers/patientController');

router.get('/me', protect, c.listMine);
router.post('/', protect, c.create);
router.patch('/:id', protect, c.update);
router.delete('/:id', protect, c.remove);
router.get('/:id/bookings', protect, c.bookings);
router.get('/:id/reports', protect, c.reports);

module.exports = router;
