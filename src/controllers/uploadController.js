const asyncHandler = require('express-async-handler');

exports.uploadPrescription = asyncHandler(async (req, res) => {
  const fileKey = req.file?.key;
  const fileUrl = req.file?.location || (fileKey ? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}` : null);

  res.status(201).json({
    message: 'Prescription uploaded',
    fileUrl,
    fileName: req.file?.originalname,
    storageKey: fileKey
  });
});
