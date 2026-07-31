const twilio = require('twilio');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const IntegrationSetting = require('../models/IntegrationSetting');
const { decrypt } = require('../utils/encryption');

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

async function sendSms({ to, message }) {
  const db = await loadDbConfig('sms');
  const snsClient = new SNSClient({
    region: db.region || process.env.AWS_SNS_REGION || 'ap-south-1', // Mumbai for India
    credentials: {
      accessKeyId: db.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: db.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  const command = new PublishCommand({
    Message: message,
    PhoneNumber: formatIndian(to),
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
      'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: 'DiagHub' },
    },
  });
  return snsClient.send(command);
}

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
