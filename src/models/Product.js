const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  type: { type: String, enum: ['test', 'package', 'medicine'], required: true },
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab' },
  description: String,
  price: { type: Number, required: true },
  salePrice: Number,
  discountPercent: Number,
  fastingRequired: { type: Boolean, default: false },
  homeCollection: { type: Boolean, default: false },
  reportTime: String,
  brand: String,
  sampleType: String,
  tags: [String],
  seoTitle: String,
  seoDescription: String,
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
