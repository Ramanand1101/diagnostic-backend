const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendMail } = require('../config/email');
const { sendSms, sendWhatsapp } = require('../config/sms');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

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

exports.register = asyncHandler(async (req, res) => {
  const { name, email, mobile, password, role } = req.body;

  const exists = await User.findOne({ $or: [{ email }, { mobile }] });
  if (exists) return res.status(400).json({ message: 'User already exists' });

  const user = await User.create({
    name,
    email,
    mobile,
    password,
    role: role || 'customer'
  });

  const token = signToken(user);

  res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      verified: true
    }
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { emailOrMobile, password } = req.body;
  const user = await User.findOne({
    $or: [{ email: emailOrMobile }, { mobile: emailOrMobile }]
  }).select('+password');

  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await user.matchPassword(password);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role
    }
  });
});

exports.sendOtp = asyncHandler(async (req, res) => {
  // channel: 'email' | 'sms' | 'whatsapp'
  const { emailOrMobile, purpose = 'login', channel = 'email' } = req.body;
  const identifier = String(emailOrMobile || '').trim();

  if (!identifier) return res.status(400).json({ message: 'Email or mobile is required' });

  const isEmail = identifier.includes('@');
  // For mobile channels, validate it's a phone number
  if (!isEmail && channel === 'email') {
    return res.status(400).json({ message: 'Choose SMS or WhatsApp to receive OTP on mobile' });
  }
  if (isEmail && channel !== 'email') {
    return res.status(400).json({ message: 'Enter a mobile number for SMS or WhatsApp OTP' });
  }

  const { otp } = await createOtpRecord({ identifier, purpose });

  const expiryMins = process.env.OTP_EXPIRY_MINUTES || 10;
  const message = `Your DiagnosticHub OTP is ${otp}. Valid for ${expiryMins} mins. Do not share with anyone.`;

  if (channel === 'whatsapp') {
    await sendWhatsapp({ to: identifier, message });
  } else if (channel === 'sms') {
    await sendSms({ to: identifier, message });
  } else {
    await sendMail({
      to: identifier,
      subject: 'Your DiagnosticHub OTP',
      text: message,
      html: `<p>Your OTP is <b>${otp}</b>. It expires in ${expiryMins} minutes.</p><p>Do not share this with anyone.</p>`,
    });
  }

  res.json({ message: 'OTP sent', delivery: channel, purpose });
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const { emailOrMobile, otp, purpose = 'login', name, password, role } = req.body;
  const identifier = String(emailOrMobile || '').trim();

  if (!identifier || !otp) {
    return res.status(400).json({ message: 'Email/mobile and OTP are required' });
  }

  const record = await Otp.findOne({
    identifier,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort('-createdAt');

  if (!record) return res.status(400).json({ message: 'OTP expired or invalid' });

  record.attempts += 1;
  if (record.attempts > 5) {
    record.isUsed = true;
    await record.save();
    return res.status(429).json({ message: 'Too many attempts' });
  }

  const ok = await bcrypt.compare(String(otp), record.otpHash);
  if (!ok) {
    await record.save();
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  record.isUsed = true;
  record.verifiedAt = new Date();
  await record.save();

  let user = await User.findOne({
    $or: [{ email: identifier }, { mobile: identifier }]
  });

  if (!user) {
    if (!name) {
      return res.status(400).json({ message: 'Name is required for new OTP signup' });
    }
    user = await User.create({
      name,
      email: identifier.includes('@') ? identifier : undefined,
      mobile: identifier.includes('@') ? undefined : identifier,
      password: password || cryptoRandomPassword(),
      role: role || 'customer',
      verified: true
    });
  }

  if (purpose === 'verify_email') {
    user.verified = true;
    await user.save();
  }

  const token = signToken(user);

  res.json({
    message: 'OTP verified',
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      verified: user.verified
    }
  });
});

function cryptoRandomPassword() {
  return `Tmp@${Math.random().toString(36).slice(-10)}${Date.now().toString().slice(-4)}`;
}

exports.me = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// POST /api/v1/auth/google
// Receives Google credential (ID token), verifies it, returns JWT.
exports.googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential is required' });

  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: 'Invalid Google token' });
  }

  const { sub: googleId, email, name, picture } = payload;

  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId;
      if (!user.avatar && picture) user.avatar = picture;
    }
  } else {
    user = await User.create({
      name, email, googleId,
      avatar: picture,
      role: 'customer',
      verified: true,
    });
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      avatar: user.avatar,
    },
  });
});
