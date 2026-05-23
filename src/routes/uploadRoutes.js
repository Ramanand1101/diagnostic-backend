const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const { makeUpload } = require('../middleware/uploadMiddleware');
const { uploadPrescription } = require('../controllers/uploadController');

const prescriptionUpload = makeUpload(process.env.AWS_S3_PRESCRIPTIONS_PREFIX || 'prescriptions');

router.post('/prescription', protect, prescriptionUpload.single('file'), uploadPrescription);

module.exports = router;
