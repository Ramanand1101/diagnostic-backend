const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Lab = require('../models/Lab');

exports.createReview = asyncHandler(async (req, res) => {
  const sentiment = Number(req.body.rating) >= 4 ? 'happy' : Number(req.body.rating) <= 2 ? 'unhappy' : 'neutral';
  const review = await Review.create({
    ...req.body,
    user: req.user._id,
    sentiment,
    verified: true
  });

  if (req.body.lab) {
    const reviews = await Review.find({ lab: req.body.lab });
    const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
    await Lab.findByIdAndUpdate(req.body.lab, {
      ratingAvg: Number(avg.toFixed(2)),
      reviewCount: reviews.length
    });
  }

  res.status(201).json(review);
});

exports.listReviews = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.lab) filter.lab = req.query.lab;
  const reviews = await Review.find(filter).populate('user lab booking').sort('-createdAt');
  res.json(reviews);
});
