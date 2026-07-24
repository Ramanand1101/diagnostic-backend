const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});

// Atomic increment — safe under PM2 cluster and concurrent requests
// startFrom: first value returned will be startFrom+1 (e.g. startFrom=1549 → first seq = 1550)
counterSchema.statics.nextSeq = async function (name, startFrom = 0) {
  const doc = await this.findOneAndUpdate(
    { _id: name },
    [{ $set: { seq: { $add: [{ $ifNull: ['$seq', startFrom] }, 1] } } }],
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);
