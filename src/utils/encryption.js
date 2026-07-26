// AES-256-GCM encryption for secrets stored at rest (e.g. integration API keys).
// Requires INTEGRATION_ENCRYPTION_KEY in the environment — a 64-char hex string (32 bytes).
const crypto = require('crypto');

function getKey() {
  const hex = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  return Buffer.from(hex, 'hex');
}

// Returns a single string: iv:authTag:ciphertext (all hex) — safe to store in a DB text field.
function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(payload) {
  const [ivHex, authTagHex, dataHex] = String(payload).split(':');
  if (!ivHex || !authTagHex || !dataHex) throw new Error('Malformed encrypted payload');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

// Masks a secret for display — keeps the last 4 chars visible, e.g. "••••••••1234"
function mask(value) {
  const s = String(value || '');
  if (s.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(s.length - 4, 12))}${s.slice(-4)}`;
}

module.exports = { encrypt, decrypt, mask };
