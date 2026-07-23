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

function allowPermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(403).json({ message: 'Forbidden' });
    if (req.user.role === 'superadmin') return next();
    if (req.user.role === 'subadmin' && req.user.permissions?.includes(permission)) return next();
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
}

// Call this after changing a user's role/status so the cached record is evicted
async function invalidateUserCache(userId) {
  await cacheDel(userKey(String(userId)));
}

module.exports = { protect, allowRoles, allowPermission, invalidateUserCache };
