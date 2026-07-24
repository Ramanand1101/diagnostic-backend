const mongoose = require('mongoose');

const packageItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  name: { type: String, required: true },
  price: { type: Number, default: 0 },
}, { _id: false });

const corporatePackageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  items: [packageItemSchema],
  basePrice: { type: Number, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('CorporatePackage', corporatePackageSchema);
