const router = require('express').Router();
const asyncHandler = require('express-async-handler');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { protect, allowRoles } = require('../middleware/authMiddleware');
const { makePublicUpload } = require('../middleware/uploadMiddleware');
const { s3, bucket } = require('../config/s3');
const controller = require('../controllers/heroSlideController');

const imageUpload = makePublicUpload(process.env.AWS_S3_HERO_SLIDES_PREFIX || 'hero-slides');
const adminOnly = [protect, allowRoles('superadmin', 'subadmin')];

// Upload image → S3, returns canonical URL (for DB) + presigned URL (for immediate preview)
router.post(
  '/upload',
  ...adminOnly,
  imageUpload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    const url =
      req.file.location ||
      `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${req.file.key}`;

    const previewUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: req.file.key }),
      { expiresIn: 86400 }
    );

    res.json({ url, previewUrl });
  })
);

router.get('/', controller.list);
router.post('/', ...adminOnly, controller.create);
router.put('/:id', ...adminOnly, controller.update);
router.delete('/:id', ...adminOnly, controller.remove);

module.exports = router;
