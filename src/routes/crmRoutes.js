const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const c = require('../controllers/crmController');

const admin = [protect, allowRoles('superadmin', 'subadmin')];

router.get('/stats', ...admin, c.stats);
router.get('/patients', ...admin, c.patientList);
router.get('/patients/:id', ...admin, c.patientDetail);

module.exports = router;
