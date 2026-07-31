const nodemailer = require('nodemailer');
const IntegrationSetting = require('../models/IntegrationSetting');
const { decrypt } = require('../utils/encryption');

// Admin-saved SMTP credentials (Admin > Integrations) take priority over .env — cached
// briefly so every mail send isn't a DB round-trip, but a saved change picks up quickly.
const CACHE_TTL_MS = 30 * 1000;
let cache = { config: null, expiresAt: 0 };

async function getEmailConfig() {
  if (cache.config && Date.now() < cache.expiresAt) return cache.config;

  let dbConfig = null;
  try {
    const record = await IntegrationSetting.findOne({ key: 'email', enabled: true }).lean();
    if (record?.configEncrypted) {
      const parsed = JSON.parse(decrypt(record.configEncrypted));
      if (parsed.host && parsed.user && parsed.pass) dbConfig = parsed;
    }
  } catch (e) {
    console.error('[Email] failed to load integration config from DB, falling back to .env:', e.message);
  }

  const config = {
    host: dbConfig?.host || process.env.EMAIL_HOST,
    port: Number(dbConfig?.port || process.env.EMAIL_PORT || 587),
    user: dbConfig?.user || process.env.EMAIL_USER,
    pass: dbConfig?.pass || process.env.EMAIL_PASS,
    from: dbConfig?.from || process.env.EMAIL_FROM || dbConfig?.user || process.env.EMAIL_USER,
  };

  cache = { config, expiresAt: Date.now() + CACHE_TTL_MS };
  return config;
}

async function sendMail({ to, subject, text, html }) {
  const config = await getEmailConfig();
  if (!config.user || !config.pass) {
    throw new Error('Email configuration is missing');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };
