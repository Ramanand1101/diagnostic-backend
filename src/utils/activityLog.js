const AuditLog = require('../models/AuditLog');

// Fire-and-forget activity logging — never throws, never blocks/breaks the caller.
// `actor` is the req.user object (or null for system/unauthenticated events like a login attempt).
// `previousValue`/`newValue` are plain strings for a clean before/after diff in the UI —
// pass them for any field-level change (email, mobile, status, etc). `ipAddress`/`userAgent`
// should come from requestMeta(req) at the call site whenever the change originates from an
// HTTP request, so the audit trail can show where/what device performed it.
async function logActivity({ actor, action, entity, entityId, description, payload, previousValue, newValue, ipAddress, userAgent }) {
  try {
    await AuditLog.create({
      actor: actor?._id || null,
      actorName: actor?.name || 'System',
      actorRole: actor?.role || 'system',
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      description,
      previousValue: previousValue !== undefined ? String(previousValue) : undefined,
      newValue: newValue !== undefined ? String(newValue) : undefined,
      ipAddress,
      userAgent,
      payload,
    });
  } catch (err) {
    console.error('[ActivityLog] failed to record:', action, err.message);
  }
}

// Pulls the caller's IP + device/browser string off an Express req — use this at every
// call site logging a user-profile change so the audit trail is complete.
function requestMeta(req) {
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || req.ip || '';
  const userAgent = req.headers['user-agent'] || '';
  return { ipAddress, userAgent };
}

module.exports = { logActivity, requestMeta };
