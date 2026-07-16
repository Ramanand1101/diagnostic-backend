const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
  lab: { type: mongoose.Schema.Types.ObjectId, ref: 'Lab', default: null },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  type: {
    type: String,
    enum: ['call', 'whatsapp', 'email', 'visit'],
    default: 'call'
  },
  scheduledAt: { type: Date, required: true },
  completedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['pending', 'done', 'missed', 'rescheduled'],
    default: 'pending'
  },
  notes: { type: String, default: '' },
  outcome: { type: String, default: '' },
}, { timestamps: true });

followUpSchema.index({ status: 1 });
followUpSchema.index({ scheduledAt: 1 });
followUpSchema.index({ patient: 1 });
followUpSchema.index({ lead: 1 });

module.exports = mongoose.model('FollowUp', followUpSchema);
