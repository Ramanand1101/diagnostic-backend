const asyncHandler = require('express-async-handler');
const AuditLog = require('../models/AuditLog');

// GET /api/v1/activity-log?entity=Corporate&entityId=...&action=...&page=&limit=
exports.listActivity = asyncHandler(async (req, res) => {
  const { entity, entityId, action, page = 1, limit = 50 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const filter = {};
  if (entity) filter.entity = entity;
  if (entityId) filter.entityId = entityId;
  if (action) filter.action = new RegExp(`^${action}`, 'i');

  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort('-createdAt').skip(skip).limit(safeLimit),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});
