const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token invalid' });
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

// Superadmin always passes. Subadmin passes only if they have the specific permission key.
function allowPermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(403).json({ message: 'Forbidden' });
    if (req.user.role === 'superadmin') return next();
    if (req.user.role === 'subadmin' && req.user.permissions?.includes(permission)) return next();
    return res.status(403).json({ message: 'Insufficient permissions' });
  };
}

module.exports = { protect, allowRoles, allowPermission };
