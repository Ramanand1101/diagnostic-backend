const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  message: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }, // true = HealthOnTime support, false = the ticket's own user
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  repliedByName: String,
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  ticketNo: { type: String, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  subject: String,
  message: String,
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  category: String,
  replies: [replySchema],
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
