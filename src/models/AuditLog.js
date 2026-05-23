const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  entity: String,
  entityId: String,
  payload: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditSchema);
