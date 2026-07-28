const bcrypt = require('bcryptjs');
const Otp = require('../models/Otp');

function generateOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min)));
}

async function createOtpRecord({ identifier, purpose }) {
  const length = Number(process.env.OTP_LENGTH || 6);
  const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES || 10);
  const otp = generateOtp(length);
  const otpHash = await bcrypt.hash(otp, 10);

  await Otp.deleteMany({ identifier, purpose, isUsed: false });

  const record = await Otp.create({
    identifier,
    otpHash,
    purpose,
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000)
  });

  return { otp, record };
}

// Verifies a not-yet-used, not-expired OTP for (identifier, purpose). On success marks
// it used and returns true; on failure increments attempts and returns an error message.
async function verifyOtpRecord({ identifier, purpose, otp }) {
  const record = await Otp.findOne({ identifier, purpose, isUsed: false, expiresAt: { $gt: new Date() } }).sort('-createdAt');
  if (!record) return { ok: false, message: 'OTP expired or invalid. Please request a new one.' };

  record.attempts += 1;
  if (record.attempts > 5) {
    record.isUsed = true;
    await record.save();
    return { ok: false, message: 'Too many attempts. Please request a new OTP.' };
  }

  const matches = await bcrypt.compare(String(otp), record.otpHash);
  if (!matches) {
    await record.save();
    return { ok: false, message: 'Invalid OTP.' };
  }

  record.isUsed = true;
  record.verifiedAt = new Date();
  await record.save();
  return { ok: true };
}

module.exports = { generateOtp, createOtpRecord, verifyOtpRecord };
