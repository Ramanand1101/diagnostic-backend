const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  excerpt: String,
  content: String,
  coverImage: String,
  seoTitle: String,
  seoDescription: String,
  tags: [String],
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Blog', blogSchema);
