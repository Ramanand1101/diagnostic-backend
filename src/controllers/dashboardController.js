const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Lab = require('../models/Lab');
const Product = require('../models/Product');
const Booking = require('../models/Booking');
const Report = require('../models/Report');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const Ticket = require('../models/Ticket');

exports.stats = asyncHandler(async (req, res) => {
  const [
    users, labs, products, bookings, reports, reviews, coupons, tickets
  ] = await Promise.all([
    User.countDocuments(),
    Lab.countDocuments(),
    Product.countDocuments(),
    Booking.countDocuments(),
    Report.countDocuments(),
    Review.countDocuments(),
    Coupon.countDocuments(),
    Ticket.countDocuments()
  ]);

  res.json({
    users, labs, products, bookings, reports, reviews, coupons, tickets
  });
});
