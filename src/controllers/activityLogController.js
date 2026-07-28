const asyncHandler = require('express-async-handler');
const AuditLog = require('../models/AuditLog');

// GET /api/v1/activity-log?entity=Corporate&entityId=...&action=...&page=&limit=
exports.listActivity = asyncHandler(async (req, res) => {
  const { entity, entityId, action, excludeActions, page = 1, limit = 50 } = req.query;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const filter = {};
  if (entity) filter.entity = entity;
  if (entityId) filter.entityId = entityId;
  // Comma-separated exact action names to exclude, e.g. a "Profile Changes" filter that
  // matches the `user.` prefix but should exclude `user.login`/`user.logout` noise.
  if (action || excludeActions) {
    filter.action = {};
    if (action) filter.action.$regex = new RegExp(`^${action}`, 'i');
    if (excludeActions) filter.action.$nin = excludeActions.split(',');
  }

  const skip = (Number(page) - 1) * safeLimit;
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort('-createdAt').skip(skip).limit(safeLimit),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, page: Number(page), limit: safeLimit, total });
});
