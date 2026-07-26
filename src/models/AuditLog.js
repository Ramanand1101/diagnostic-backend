const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: String,
  actorRole: String,
  action: String,       // e.g. 'corporate.created', 'appointment.rescheduled', 'user.login'
  entity: String,        // e.g. 'Corporate', 'CorporateAppointment', 'User'
  entityId: String,
  description: String,   // human-readable summary for the activity feed
  payload: mongoose.Schema.Types.Mixed
}, { timestamps: true });

auditSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
auditSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditSchema);
