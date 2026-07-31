const https = require('https');
const twilio = require('twilio');
const IntegrationSetting = require('../models/IntegrationSetting');
const { decrypt } = require('../utils/encryption');

// Plain https.get instead of the global `fetch` — fetch is only available on Node 18+,
// and relying on it silently 500s every SMS send on an older Node runtime.
function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let data = {};
        try { data = JSON.parse(body); } catch { /* non-JSON response, handled by caller via empty data */ }
        resolve({ statusCode: res.statusCode, data });
      });
    }).on('error', reject);
  });
}

// Admin-saved credentials (Admin > Integrations) take priority over .env — cached
// briefly so every send isn't a DB round-trip, but a saved change picks up quickly.
const CACHE_TTL_MS = 30 * 1000;
const cache = { sms: { config: null, expiresAt: 0 }, whatsapp: { config: null, expiresAt: 0 } };

async function loadDbConfig(key) {
  const entry = cache[key];
  if (entry.config !== null && Date.now() < entry.expiresAt) return entry.config;

  let dbConfig = null;
  try {
    const record = await IntegrationSetting.findOne({ key, enabled: true }).lean();
    if (record?.configEncrypted) dbConfig = JSON.parse(decrypt(record.configEncrypted));
  } catch (e) {
    console.error(`[${key}] failed to load integration config from DB, falling back to .env:`, e.message);
  }

  entry.config = dbConfig || {};
  entry.expiresAt = Date.now() + CACHE_TTL_MS;
  return entry.config;
}

function formatIndian(mobile) {
  const digits = String(mobile).replace(/\D/g, '').replace(/^91/, '');
  return `+91${digits}`;
}

// ── SMS via Fast2SMS ───────────────────────────────────────────────────────
// Free Fast2SMS dev keys are only approved for the `otp` route (a fixed,
// pre-approved template with a single numeric variable) — arbitrary text needs
// the `q` (quick) route, which requires DLT registration on the account. Since
// every current caller's message embeds a numeric code, we extract it and use
// the OTP route; anything without a clear numeric code falls back to `q` and
// simply surfaces whatever error Fast2SMS returns for that account's plan.
async function sendSms({ to, message }) {
  const db = await loadDbConfig('sms');
  const apiKey = db.apiKey || process.env.FAST2SMS_API_KEY;
  if (!apiKey) throw new Error('SMS not configured. Add a Fast2SMS API key in Admin > Integrations, or FAST2SMS_API_KEY to .env');

  const mobile = formatIndian(to).replace('+91', '');
  const otpMatch = String(message).match(/\b\d{4,8}\b/);

  const params = new URLSearchParams({ authorization: apiKey, numbers: mobile });
  if (otpMatch) {
    params.set('route', 'otp');
    params.set('variables_values', otpMatch[0]);
  } else {
    params.set('route', 'q');
    params.set('message', message);
  }

  const { statusCode, data } = await httpsGetJson(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
  if (statusCode < 200 || statusCode >= 300 || data.return !== true) {
    const reason = Array.isArray(data.message) ? data.message.join(', ') : (data.message || `HTTP ${statusCode}`);
    throw new Error(`Fast2SMS send failed: ${reason}`);
  }
  return data;
}

// ── WhatsApp via Twilio ──────────────────────────────────────────────────────
async function sendWhatsapp({ to, message }) {
  const db = await loadDbConfig('whatsapp');
  const accountSid = db.accountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = db.authToken || process.env.TWILIO_AUTH_TOKEN;
  const fromWa = db.whatsappFrom || process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  if (!accountSid || !authToken) throw new Error('WhatsApp not configured. Add Twilio credentials in Admin > Integrations, or TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN to .env');

  const twilioClient = twilio(accountSid, authToken);
  return twilioClient.messages.create({
    body: message,
    from: fromWa,
    to: `whatsapp:${formatIndian(to)}`,
  });
}

module.exports = { sendSms, sendWhatsapp };
