const Razorpay = require('razorpay');
const IntegrationSetting = require('../models/IntegrationSetting');
const { decrypt } = require('../utils/encryption');

// Admin-saved Razorpay credentials (Admin > Integrations) take priority over .env —
// cached briefly so every order/verify call isn't a DB round-trip, mirrors src/config/email.js.
const CACHE_TTL_MS = 30 * 1000;
let cache = { config: null, expiresAt: 0 };

async function loadConfig() {
  if (cache.config && Date.now() < cache.expiresAt) return cache.config;

  let dbConfig = null;
  try {
    const record = await IntegrationSetting.findOne({ key: 'payment', enabled: true }).lean();
    if (record?.configEncrypted) {
      const parsed = JSON.parse(decrypt(record.configEncrypted));
      if (parsed.keyId && parsed.keySecret) dbConfig = parsed;
    }
  } catch (e) {
    console.error('[Razorpay] failed to load integration config from DB, falling back to .env:', e.message);
  }

  const config = {
    keyId: dbConfig?.keyId || process.env.RAZORPAY_KEY_ID,
    keySecret: dbConfig?.keySecret || process.env.RAZORPAY_KEY_SECRET,
  };

  cache = { config, expiresAt: Date.now() + CACHE_TTL_MS };
  return config;
}

async function getRazorpayClient() {
  const { keyId, keySecret } = await loadConfig();
  if (!keyId || !keySecret) {
    throw new Error('Payment gateway not configured. Add Razorpay Key ID/Secret in Admin > Integrations.');
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function getPublicKeyId() {
  const { keyId } = await loadConfig();
  return keyId;
}

module.exports = { getRazorpayClient, getPublicKeyId, loadConfig };
