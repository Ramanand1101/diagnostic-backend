// Jest `setupFiles` entry — runs before any test module graph loads, so every
// controller/config module that reads process.env at require-time sees these.
// Deliberately does NOT set MONGO_URI — tests/helpers/db.js points mongoose at an
// in-memory instance instead, so nothing here can ever touch the real shared cluster.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.INTEGRATION_ENCRYPTION_KEY = '128cd259af0051b2c0e86f6a39fa8fab27668eca711e2d90be64a36c6cdd37e8'.slice(0, 64);
process.env.OTP_EXPIRY_MINUTES = '10';
process.env.OTP_LENGTH = '6';
process.env.CLIENT_URL = 'http://localhost:3000';

