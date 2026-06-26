const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Otp = require('../models/Otp');
const { sendMail } = require('../config/email');

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
  const { emailOrMobile, purpose = 'login' } = req.body;
  const identifier = String(emailOrMobile || '').trim();

  if (!identifier) return res.status(400).json({ message: 'Email or mobile is required' });

  const { otp } = await createOtpRecord({ identifier, purpose });

  const isEmail = identifier.includes('@');
  if (isEmail) {
    await sendMail({
      to: identifier,
      subject: 'Your OTP code',
      text: `Your OTP is ${otp}. It expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`,
      html: `<p>Your OTP is <b>${otp}</b>.</p><p>It expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.</p>`
    });
  }

  res.json({
    message: 'OTP sent',
    delivery: isEmail ? 'email' : 'mobile',
    purpose
  });
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
