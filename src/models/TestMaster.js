const mongoose = require('mongoose');

const testMasterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  subcategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  description: { type: String, default: '' },
  sampleType: { type: String, default: '' },
  reportTime: { type: String, default: '' },
  fastingRequired: { type: Boolean, default: false },
  homeCollection: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

testMasterSchema.index({ name: 'text' });
testMasterSchema.index({ category: 1, isActive: 1 });
testMasterSchema.index({ isActive: 1, name:     1 });

module.exports = mongoose.model('TestMaster', testMasterSchema);
