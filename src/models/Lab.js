const mongoose = require('mongoose');

const serviceAreaSchema = new mongoose.Schema({
  city: String,
  radiusKm: Number
}, { _id: false });

const labSchema = new mongoose.Schema({
  owners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  name: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
  description: String,
  address: String,
  area: String,
  city: { type: String, index: true },
  state: String,
  pincode: String,
  phone: String,
  email: String,
  phones: [String],
  emails: [String],
  website: String,
  lat: Number,
  lng: Number,
  mapPlaceId: String,
  // Derived from lat/lng (kept in sync by the controller — see buildLabGeoFields in
  // labController.js) purely so we can run $geoNear/$near queries with a 2dsphere index.
  // lat/lng remain the source of truth that admins/CSV/forms actually read and write.
  location: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number], default: undefined } // [lng, lat]
  },
  openingHours: String,
  homeCollection: { type: Boolean, default: false },
  approved: { type: Boolean, default: false },
  changesPending: { type: Boolean, default: false, index: true },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  badges: [String],
  accreditation: [String],
  ratingAvg: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  sampleCollectionTime: String,
  reportDeliveryTime: String,
  serviceAreas: [serviceAreaSchema],
  commissionPercent: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  seoTitle: String,
  seoDescription: String
}, { timestamps: true });

labSchema.index({ city: 1, approved: 1 });
labSchema.index({ brand: 1, approved: 1 });
labSchema.index({ approved: 1, featured: -1, ratingAvg: -1 });
labSchema.index({ name: 'text', address: 'text', city: 'text' });
labSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Lab', labSchema);
