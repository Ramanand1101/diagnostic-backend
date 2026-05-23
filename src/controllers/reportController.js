const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const Report = require('../models/Report');

function publicUrlFromKey(key) {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

exports.uploadReport = asyncHandler(async (req, res) => {
  const fileKey = req.file?.key;
  const fileUrl = req.file?.location || (fileKey ? publicUrlFromKey(fileKey) : null);

  const report = await Report.create({
    booking: req.body.booking,
    uploadedBy: req.user._id,
    fileUrl,
    fileName: req.file?.originalname,
    sharedToken: crypto.randomBytes(16).toString('hex'),
    storageKey: fileKey
  });

  res.status(201).json(report);
});

exports.listReports = asyncHandler(async (req, res) => {
  const reports = await Report.find().populate('booking').sort('-createdAt');
  res.json(reports);
});

exports.getSharedReport = asyncHandler(async (req, res) => {
  const report = await Report.findOne({ sharedToken: req.params.token }).populate('booking');
  if (!report) return res.status(404).json({ message: 'Report not found' });
  res.json(report);
});
