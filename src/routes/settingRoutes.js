const router = require('express').Router();
const { protect, allowRoles } = require('../middleware/authMiddleware');
const controller = require('../controllers/settingController');
const Setting = require('../models/Setting');

// Public — read a single setting by key (no auth)
router.get('/public/:key', async (req, res) => {
  try {
    const s = await Setting.findOne({ key: req.params.key }).lean();
    res.json({ value: s?.value ?? null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', protect, allowRoles('superadmin'), controller.list);
router.post('/', protect, allowRoles('superadmin'), controller.create);
router.put('/:id', protect, allowRoles('superadmin'), controller.update);

module.exports = router;
