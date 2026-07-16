const router = require('express').Router();
const multer = require('multer');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const lab = require('../controllers/labController');

const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', lab.listLabs);
router.get('/cities', lab.getCities);
router.get('/demo-csv', lab.labDemoCsv);
router.get('/nearby', lab.nearbyLabs);
router.get('/compare', lab.compareLabs);
router.get('/mine', protect, allowRoles('lab'), lab.getMyLab);
router.post('/bulk-csv', protect, allowRoles('superadmin', 'subadmin'), csvUpload.single('file'), lab.bulkUploadLabsCsv);
router.delete('/bulk-delete', protect, allowRoles('superadmin', 'subadmin'), lab.bulkDeleteLabs);
router.get('/:slug', lab.getLabBySlug);
router.post('/', protect, allowRoles('superadmin', 'subadmin', 'lab'), lab.createLab);
router.put('/:id', protect, allowRoles('superadmin', 'subadmin', 'lab'), lab.updateLab);
router.patch('/:id/approve', protect, allowRoles('superadmin'), lab.approveLab);
router.patch('/:id/reject', protect, allowRoles('superadmin'), lab.rejectLab);

module.exports = router;
