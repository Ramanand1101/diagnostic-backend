const asyncHandler = require('express-async-handler');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const HeroSlide = require('../models/HeroSlide');
const { s3, bucket } = require('../config/s3');

// Extract S3 key from a full S3 URL
function keyFromUrl(url) {
  if (!url) return null;
  // Already a plain key (no https://)
  if (!url.startsWith('http')) return url;
  try {
    const { pathname } = new URL(url);
    return decodeURIComponent(pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
}

async function toPresigned(imageUrl) {
  const key = keyFromUrl(imageUrl);
  if (!key) return imageUrl;
  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 86400 } // 24 hours
    );
  } catch {
    return imageUrl; // fall back to original if signing fails
  }
}

const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';
  const slides = await HeroSlide.find(filter).sort({ sortOrder: 1, createdAt: 1 });

  const result = await Promise.all(
    slides.map(async (slide) => {
      const obj = slide.toObject();
      obj.imageUrl = await toPresigned(obj.imageUrl);
      return obj;
    })
  );

  res.json(result);
});

const create = asyncHandler(async (req, res) => {
  const slide = await HeroSlide.create(req.body);
  res.status(201).json(slide);
});

const update = asyncHandler(async (req, res) => {
  const slide = await HeroSlide.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!slide) return res.status(404).json({ message: 'Not found' });
  res.json(slide);
});

const remove = asyncHandler(async (req, res) => {
  const slide = await HeroSlide.findByIdAndDelete(req.params.id);
  if (!slide) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

module.exports = { list, create, update, remove };
