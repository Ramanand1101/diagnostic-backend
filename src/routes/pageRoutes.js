const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/pageController');

router.get('/', controller.list);
router.get('/:slug', controller.getBySlug);
router.post('/', protect, allowModule('pages', 'create'), controller.create);
router.put('/:id', protect, allowModule('pages', 'edit'), controller.update);
router.delete('/:id', protect, allowModule('pages', 'delete'), controller.remove);

module.exports = router;
