const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/bookingController');

router.get('/stats', protect, allowRoles('superadmin', 'subadmin'), controller.getStats);
router.post('/', protect, controller.createBooking);
router.get('/', protect, controller.listBookings);
router.get('/:id', protect, controller.getBooking);
router.patch('/:id/status', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.updateBookingStatus);
router.patch('/:id/paid', protect, allowRoles('superadmin', 'subadmin', 'lab'), controller.markPaid);
router.patch('/:id/edit', protect, allowRoles('superadmin', 'subadmin'), controller.updateBooking);
router.patch('/:id/restore', protect, allowRoles('superadmin', 'subadmin'), controller.restoreBooking);
router.delete('/:id', protect, allowRoles('superadmin', 'subadmin'), controller.deleteBooking);

module.exports = router;
