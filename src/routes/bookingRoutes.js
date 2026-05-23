const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/bookingController');

router.post('/', protect, controller.createBooking);
router.get('/', protect, controller.listBookings);
router.get('/:id', protect, controller.getBooking);
router.patch('/:id/status', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.updateBookingStatus);
router.patch('/:id/paid', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.markPaid);

module.exports = router;
