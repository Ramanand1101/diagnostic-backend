const rateLimit = require('express-rate-limit');
const { isReady, getClient } = require('../config/redis');

// Dynamically pick store at request time so Redis failures don't crash startup
function makeStore() {
  // Only import RedisStore when redis is ready, otherwise use default memory store
  if (!isReady()) return undefined;
  try {
    const { RedisStore } = require('rate-limit-redis');
    return new RedisStore({
      sendCommand: (...args) => getClient().sendCommand(args),
    });
  } catch {
    return undefined;
  }
}

function limiter(options = {}) {
  const { windowMs = 15 * 60 * 1000, max = 200, message = 'Too many requests, please try again later.' } = options;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    // Store is evaluated lazily on first request
    store: makeStore(),
    skip: (req) => {
      // Never rate-limit health checks
      return req.path === '/health';
    },
  });
}

// Per-route rate limiters
const publicLimiter = limiter({ windowMs: 15 * 60 * 1000, max: 300 });       // general public
const authLimiter  = limiter({ windowMs: 15 * 60 * 1000, max: 20,  message: 'Too many auth attempts, try again in 15 minutes.' });
const otpLimiter   = limiter({ windowMs: 10 * 60 * 1000, max: 5,   message: 'Too many OTP requests. Wait 10 minutes.' });
const adminLimiter = limiter({ windowMs: 15 * 60 * 1000, max: 1000 });        // admins get higher limit

module.exports = { publicLimiter, authLimiter, otpLimiter, adminLimiter };
