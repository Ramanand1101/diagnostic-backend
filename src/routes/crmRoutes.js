const express = require('express');
const router = express.Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const c = require('../controllers/crmController');

const admin = [protect, allowModule('crm', 'view')];

router.get('/stats', ...admin, c.stats);
router.get('/patients', ...admin, c.patientList);
router.get('/patients/:id', ...admin, c.patientDetail);

module.exports = router;
