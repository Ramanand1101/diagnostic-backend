const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/bookingController');

router.get('/stats', protect, allowModule('bookings', 'view'), controller.getStats);
router.post('/', protect, controller.createBooking);
router.get('/', protect, controller.listBookings);
router.get('/:id', protect, controller.getBooking);
router.patch('/:id/status', protect, allowModule('bookings', 'edit', 'lab'), controller.updateBookingStatus);
router.patch('/:id/paid', protect, allowModule('bookings', 'edit', 'lab'), controller.markPaid);
router.patch('/:id/edit', protect, allowModule('bookings', 'edit'), controller.updateBooking);
router.patch('/:id/restore', protect, allowModule('bookings', 'edit'), controller.restoreBooking);
router.delete('/:id', protect, allowModule('bookings', 'delete'), controller.deleteBooking);

module.exports = router;
