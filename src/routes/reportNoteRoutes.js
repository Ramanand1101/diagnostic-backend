const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const controller = require('../controllers/reportNoteController');

// Ownership (and the admin-read-only exception) is enforced entirely inside the
// controller — every role just needs to be logged in to reach these.
router.get('/', protect, controller.list);
router.post('/', protect, controller.create);
router.put('/:id', protect, controller.update);
router.delete('/:id', protect, controller.remove);

module.exports = router;
