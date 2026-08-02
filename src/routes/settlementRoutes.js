const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/settlementController');

router.get('/preview',     protect, allowModule('settlements', 'view'),   ctrl.previewUnsettled);
router.get('/export-csv',  protect, allowModule('settlements', 'view'),   ctrl.exportCsv);
router.get('/',             protect, allowModule('settlements', 'view'),   ctrl.listSettlements);
router.post('/',            protect, allowModule('settlements', 'create'), ctrl.generateSettlement);
router.get('/:id',          protect, allowModule('settlements', 'view'),   ctrl.getSettlement);
router.patch('/:id/status', protect, allowModule('settlements', 'edit'),   ctrl.updateSettlementStatus);

module.exports = router;
