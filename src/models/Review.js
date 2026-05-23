const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
  sentiment: { type: String, enum: ['happy', 'unhappy', 'neutral'], default: 'neutral' },
  verified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
