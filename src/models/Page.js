const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  content: String,
  seoTitle: String,
  seoDescription: String,
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Page', pageSchema);
