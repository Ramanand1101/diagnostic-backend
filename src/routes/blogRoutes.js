const router = require('express').Router();
const { protect, allowModule } = require('../middleware/authMiddleware');
const controller = require('../controllers/blogController');

router.get('/', controller.list);
router.get('/:slug', controller.getBySlug);
router.post('/', protect, allowModule('blogs', 'create'), controller.create);
router.put('/:id', protect, allowModule('blogs', 'edit'), controller.update);
router.delete('/:id', protect, allowModule('blogs', 'delete'), controller.remove);

module.exports = router;
