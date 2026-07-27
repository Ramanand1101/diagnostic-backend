const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { cacheGet, cacheSet, cacheDel } = require('../utils/cache');

const USER_TTL = 5 * 60; // cache user for 5 minutes
const userKey  = (id) => `user:${id}`;

async function protect(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  const token = auth.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }

  try {
    // Try Redis cache first — avoids DB hit on every request
    let user = await cacheGet(userKey(decoded.id));

    if (!user) {
      user = await User.findById(decoded.id).select('-password').lean();
      if (user) await cacheSet(userKey(decoded.id), user, USER_TTL);
    }

    if (!user)           return res.status(401).json({ message: 'User not found' });
    if (!user.isActive)  return res.status(401).json({ message: 'Account is disabled' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Auth check failed' });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

// Returns true if the user is allowed `action` (view/create/edit/delete) on `module`.
// `action` may also be an array of actions, in which case any one of them being granted
// is sufficient (e.g. an "upload logo" endpoint used by both the create and edit flows).
// Superadmin: always. Subadmin: only if explicitly granted that action on that module.
// Any other role: false (callers combine this with allowRoles/extraRoles for non-admin roles).
function hasModulePermission(user, module, action) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (user.role !== 'subadmin') return false;
  const entry = (user.permissions || []).find((p) => p.module === module);
  if (!entry || !Array.isArray(entry.actions)) return false;
  const actions = Array.isArray(action) ? action : [action];
  return actions.some((a) => entry.actions.includes(a));
}

// Granular, per-action permission gate. Superadmin always passes; subadmin only if the
// specific action (or, if `action` is an array, any one of them) on that module was
// explicitly granted; any `extraRoles` (e.g. 'lab' for CRM routes that labs also use)
// pass unconditionally regardless of the permissions system.
function allowModule(module, action, ...extraRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(403).json({ message: 'Forbidden' });
    if (extraRoles.includes(req.user.role)) return next();
    if (hasModulePermission(req.user, module, action)) return next();
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
}

// Call this after changing a user's role/status so the cached record is evicted
async function invalidateUserCache(userId) {
  await cacheDel(userKey(String(userId)));
}

module.exports = { protect, allowRoles, allowModule, hasModulePermission, invalidateUserCache };
