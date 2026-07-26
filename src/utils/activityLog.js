const AuditLog = require('../models/AuditLog');

// Fire-and-forget activity logging — never throws, never blocks/breaks the caller.
// `actor` is the req.user object (or null for system/unauthenticated events like a login attempt).
async function logActivity({ actor, action, entity, entityId, description, payload }) {
  try {
    await AuditLog.create({
      actor: actor?._id || null,
      actorName: actor?.name || 'System',
      actorRole: actor?.role || 'system',
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      description,
      payload,
    });
  } catch (err) {
    console.error('[ActivityLog] failed to record:', action, err.message);
  }
}

module.exports = { logActivity };
