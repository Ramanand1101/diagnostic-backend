const asyncHandler = require('express-async-handler');
const Newsletter = require('../models/Newsletter');
const { sendMail } = require('../config/email');

exports.subscribe = asyncHandler(async (req, res) => {
  const { email, source } = req.body;
  const existing = await Newsletter.findOne({ email });
  if (existing) return res.json(existing);
  const item = await Newsletter.create({ email, source });

  // Send welcome confirmation email (non-blocking)
  sendMail({
    to: email,
    subject: 'You\'re subscribed – HealthOnTime',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
        <div style="background:#0ea5e9;padding:24px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:20px">Welcome to HealthOnTime 🎉</h1>
        </div>
        <div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:none">
          <p style="margin:0 0 14px">Thanks for subscribing! You'll now receive:</p>
          <ul style="margin:0 0 16px;padding-left:18px;color:#475569;font-size:14px;line-height:1.7">
            <li>Exclusive health check-up offers</li>
            <li>New lab openings in your city</li>
            <li>Tips on preventive health screenings</li>
          </ul>
          <p style="font-size:12px;color:#94a3b8;margin:0">You can unsubscribe at any time by replying to this email.</p>
        </div>
      </div>`,
  }).catch((err) => console.error('Newsletter email failed:', err.message));

  res.status(201).json(item);
});

exports.listSubscribers = asyncHandler(async (req, res) => {
  const items = await Newsletter.find().sort('-createdAt');
  res.json(items);
});
