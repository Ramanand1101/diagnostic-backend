const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // ── Test identity ──────────────────────────────────────────────────────────
  testMaster: { type: mongoose.Schema.Types.ObjectId, ref: 'TestMaster', index: true },
  // name is kept here ONLY as a denormalized cache for fast text-search and
  // Algolia indexing. It is always synced from testMaster.name.
  name: { type: String, required: true, index: true },
  slug: { type: String, unique: true, index: true },
  type: { type: String, default: 'test' },

  // ── Lab-specific (the ONLY fields that vary per lab) ──────────────────────
  lab:             { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', index: true },
  price:           { type: Number, default: 0 },
  salePrice:       Number,
  discountPercent: Number,

  // ── Optional overrides / extras per product ───────────────────────────────
  brand:           String,
  tags:            [String],
  seoTitle:        String,
  seoDescription:  String,
  isFeatured:      { type: Boolean, default: false },
  isActive:        { type: Boolean, default: true },
  addedByAdmin:    { type: Boolean, default: false },
}, { timestamps: true });

// All test metadata (category, sampleType, reportTime, description,
// fastingRequired, homeCollection) lives in TestMaster.
// Fetch it with: Product.find(...).populate('testMaster lab')

module.exports = mongoose.model('Product', productSchema);
