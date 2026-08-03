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

async function fast2smsApiKey() {
  const db = await loadDbConfig('sms');
  const apiKey = db.apiKey || process.env.FAST2SMS_API_KEY;
  if (!apiKey) throw new Error('SMS not configured. Add a Fast2SMS API key in Admin > Integrations, or FAST2SMS_API_KEY to .env');
  return apiKey;
}

// ── OTP SMS via Fast2SMS's `otp` route ───────────────────────────────────────
// This route is pre-approved (no DLT registration needed) but only ever sends
// Fast2SMS's own fixed template with your numeric code slotted in — it ignores any
// text you send it. Only ever call this for an actual OTP code, never for a
// free-text message (see sendSms below for why that used to go wrong).
async function sendOtpSms({ to, otp }) {
  const apiKey = await fast2smsApiKey();
  const mobile = formatIndian(to).replace('+91', '');
  const params = new URLSearchParams({
    authorization: apiKey, numbers: mobile, route: 'otp', variables_values: String(otp),
  });

  const { statusCode, data } = await httpsGetJson(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
  if (statusCode < 200 || statusCode >= 300 || data.return !== true) {
    const reason = Array.isArray(data.message) ? data.message.join(', ') : (data.message || `HTTP ${statusCode}`);
    throw new Error(`Fast2SMS OTP send failed: ${reason}`);
  }
  return data;
}

// ── Free-text SMS via Fast2SMS's `q` (quick) route ───────────────────────────
// Requires DLT template registration on the Fast2SMS account — a free/trial key
// (OTP-route only) will fail here with a clear error. This used to instead guess
// whether a message "looked like" an OTP by pulling the first 4-8 digit run out of
// it and silently sending it through the OTP route — which meant a booking
// confirmation like "Booking Confirmed! ID 03082026-1557 ..." got detected as
// OTP "03082026" and delivered as Fast2SMS's fixed "Your OTP is 03082026" template
// instead of the actual message, with no error to indicate anything was wrong.
// Failing loudly here (callers already catch/log this) is the honest behavior.
async function sendSms({ to, message }) {
  const apiKey = await fast2smsApiKey();
  const mobile = formatIndian(to).replace('+91', '');
  const params = new URLSearchParams({ authorization: apiKey, numbers: mobile, route: 'q', message });

  const { statusCode, data } = await httpsGetJson(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);
  if (statusCode < 200 || statusCode >= 300 || data.return !== true) {
    const reason = Array.isArray(data.message) ? data.message.join(', ') : (data.message || `HTTP ${statusCode}`);
    throw new Error(`Fast2SMS send failed: ${reason} (free-text SMS needs a DLT-registered template on the Fast2SMS account — see fast2sms.com/dlt)`);
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

module.exports = { sendSms, sendOtpSms, sendWhatsapp };
