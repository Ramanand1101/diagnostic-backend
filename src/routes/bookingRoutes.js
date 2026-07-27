const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/bookingController');

router.get('/stats', protect, allowModule('bookings', 'view'), controller.getStats);
router.post('/', protect, controller.createBooking);
// This same endpoint backs each role's personal "My Bookings" view (scoped by the
// controller) as well as the admin-wide list — subadmins still need the 'view'
// permission explicitly granted, everyone else is scoped to their own data.
router.get('/', protect, allowModule('bookings', 'view', 'customer', 'lab', 'corporate', 'employee', 'hot_employee'), controller.listBookings);
router.get('/:id', protect, allowModule('bookings', 'view', 'customer', 'lab', 'corporate', 'employee', 'hot_employee'), controller.getBooking);
router.patch('/:id/status', protect, allowModule('bookings', 'edit', 'lab'), controller.updateBookingStatus);
router.patch('/:id/paid', protect, allowModule('bookings', 'edit', 'lab'), controller.markPaid);
router.patch('/:id/edit', protect, allowModule('bookings', 'edit'), controller.updateBooking);
router.patch('/:id/restore', protect, allowModule('bookings', 'edit'), controller.restoreBooking);
router.delete('/:id', protect, allowModule('bookings', 'delete'), controller.deleteBooking);

module.exports = router;
