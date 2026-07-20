const express = require('express');
const router = express.Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const c = require('../controllers/labCrmController');

const labOnly = [protect, allowRoles('lab')];

router.get('/stats', ...labOnly, c.stats);
router.get('/billing', ...labOnly, c.billing);
router.get('/patients', ...labOnly, c.patientList);
router.get('/patients/:id', ...labOnly, c.patientDetail);

module.exports = router;
