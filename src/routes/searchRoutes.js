const router = require('express').Router();
const { globalSearch, suggest, popular, reindexLabs, reindexProducts, reindexPages } = require('../controllers/searchController');
const { protect, allowRoles } = require('../middleware/authMiddleware');

router.get('/popular', popular);
router.get('/suggest', suggest);
router.get('/', globalSearch);
router.post('/reindex/labs', protect, allowRoles('superadmin'), reindexLabs);
router.post('/reindex/products', protect, allowRoles('superadmin'), reindexProducts);
router.post('/reindex/pages', protect, allowRoles('superadmin'), reindexPages);

module.exports = router;
