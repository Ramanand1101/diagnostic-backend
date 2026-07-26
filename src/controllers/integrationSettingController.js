const asyncHandler = require('express-async-handler');
const IntegrationSetting = require('../models/IntegrationSetting');
const { encrypt, decrypt, mask } = require('../utils/encryption');
const { logActivity } = require('../utils/activityLog');

// Defines the expected shape per integration — drives the admin form + masking.
// Sensitive fields are masked on read; non-sensitive ones (host, port, from, region) show as-is.
const INTEGRATIONS = {
  email: {
    label: 'Email (SMTP)',
    defaultProvider: 'smtp',
    fields: [
      { key: 'host', label: 'SMTP Host', sensitive: false },
      { key: 'port', label: 'SMTP Port', sensitive: false },
      { key: 'user', label: 'SMTP Username', sensitive: false },
      { key: 'pass', label: 'SMTP Password', sensitive: true },
      { key: 'from', label: 'From Address', sensitive: false },
    ],
  },
  whatsapp: {
    label: 'WhatsApp (Twilio)',
    defaultProvider: 'twilio',
    fields: [
      { key: 'accountSid', label: 'Account SID', sensitive: true },
      { key: 'authToken', label: 'Auth Token', sensitive: true },
      { key: 'whatsappFrom', label: 'WhatsApp From', sensitive: false },
    ],
  },
  sms: {
    label: 'SMS (AWS SNS)',
    defaultProvider: 'aws_sns',
    fields: [
      { key: 'accessKeyId', label: 'AWS Access Key ID', sensitive: true },
      { key: 'secretAccessKey', label: 'AWS Secret Access Key', sensitive: true },
      { key: 'region', label: 'AWS Region', sensitive: false },
    ],
  },
  payment: {
    label: 'Payment Gateway (Razorpay)',
    defaultProvider: 'razorpay',
    fields: [
      { key: 'keyId', label: 'Key ID', sensitive: true },
      { key: 'keySecret', label: 'Key Secret', sensitive: true },
    ],
  },
};

function maskConfig(key, config) {
  const def = INTEGRATIONS[key];
  if (!def) return config;
  const masked = {};
  for (const field of def.fields) {
    const val = config[field.key];
    masked[field.key] = field.sensitive ? (val ? mask(val) : '') : (val || '');
  }
  return masked;
}

// GET /api/v1/integrations — masked list of all known integrations (configured or not)
exports.listIntegrations = asyncHandler(async (req, res) => {
  const saved = await IntegrationSetting.find({}).lean();
  const byKey = Object.fromEntries(saved.map((s) => [s.key, s]));

  const items = Object.entries(INTEGRATIONS).map(([key, def]) => {
    const record = byKey[key];
    let config = {};
    let configured = false;
    if (record?.configEncrypted) {
      try {
        config = maskConfig(key, JSON.parse(decrypt(record.configEncrypted)));
        configured = true;
      } catch (e) {
        console.error(`[Integrations] failed to decrypt "${key}":`, e.message);
      }
    }
    return {
      key,
      label: def.label,
      provider: record?.provider || def.defaultProvider,
      fields: def.fields,
      config,
      configured,
      enabled: record?.enabled || false,
      updatedAt: record?.updatedAt || null,
    };
  });

  res.json({ items });
});

// PUT /api/v1/integrations/:key — superadmin only: set/update credentials (encrypted at rest)
exports.upsertIntegration = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const def = INTEGRATIONS[key];
  if (!def) return res.status(400).json({ message: `Unknown integration "${key}".` });

  const { config, enabled, provider } = req.body;
  if (!config || typeof config !== 'object') return res.status(400).json({ message: 'config object is required.' });

  // Merge with existing values for any sensitive field the admin left as the masked placeholder
  // (i.e. didn't intend to change), so re-saving other fields doesn't wipe the secret.
  const existing = await IntegrationSetting.findOne({ key });
  let existingConfig = {};
  if (existing?.configEncrypted) {
    try { existingConfig = JSON.parse(decrypt(existing.configEncrypted)); } catch { /* ignore corrupt/legacy data */ }
  }

  const merged = { ...existingConfig };
  for (const field of def.fields) {
    const incoming = config[field.key];
    if (incoming === undefined) continue;
    const isMaskedPlaceholder = field.sensitive && incoming && incoming.includes('•');
    if (!isMaskedPlaceholder) merged[field.key] = incoming;
  }

  const record = await IntegrationSetting.findOneAndUpdate(
    { key },
    {
      key,
      provider: provider || def.defaultProvider,
      configEncrypted: encrypt(JSON.stringify(merged)),
      enabled: typeof enabled === 'boolean' ? enabled : (existing?.enabled || false),
      updatedBy: req.user._id,
    },
    { new: true, upsert: true }
  );

  logActivity({ actor: req.user, action: 'integration.updated', entity: 'IntegrationSetting', entityId: record._id, description: `${req.user.name} updated the ${def.label} integration (enabled: ${record.enabled})` });
  res.json({ key, provider: record.provider, enabled: record.enabled, config: maskConfig(key, merged), configured: true, updatedAt: record.updatedAt });
});

// DELETE /api/v1/integrations/:key — superadmin only: remove stored credentials
exports.deleteIntegration = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const record = await IntegrationSetting.findOneAndDelete({ key });
  if (record) {
    logActivity({ actor: req.user, action: 'integration.deleted', entity: 'IntegrationSetting', entityId: record._id, description: `${req.user.name} removed the ${key} integration configuration` });
  }
  res.json({ message: 'Integration configuration removed' });
});
