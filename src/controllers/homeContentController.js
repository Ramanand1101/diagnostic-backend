const asyncHandler = require('express-async-handler');
const Setting = require('../models/Setting');

const KEY = 'homepage_content';

const DEFAULT_CONTENT = {
  stats: [
    { value: '2000+', label: 'Tests & Packages' },
    { value: '1000+', label: 'Partner Labs' },
    { value: '100+', label: 'Cities Covered' },
    { value: '30K+', label: 'Happy Patients' },
  ],
  whyUs: {
    title: 'Why HealthOnTime?',
    subtitle: 'Everything you need for hassle-free lab testing',
  },
  features: [
    { icon: 'FiShield', title: 'NABL Certified Labs', desc: 'All partner labs are NABL / CAP accredited and rigorously verified.', color: 'text-primary-600', bg: 'bg-primary-50' },
    { icon: 'FiClock', title: 'Fast Digital Reports', desc: 'Receive your test report digitally within hours, not days.', color: 'text-secondary-600', bg: 'bg-secondary-50' },
    { icon: 'FiActivity', title: 'Home Collection', desc: 'Our trained phlebotomists collect samples at your doorstep.', color: 'text-accent-600', bg: 'bg-accent-50' },
    { icon: 'FiAward', title: 'Best Prices', desc: 'Transparent pricing with no hidden fees and exclusive discounts.', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ],
  howItWorks: {
    title: 'How It Works',
    subtitle: 'Book your lab test in 3 simple steps',
  },
  steps: [
    { title: 'Search & Compare', desc: 'Browse 500+ tests and packages. Compare prices across certified labs in your city.' },
    { title: 'Book Your Slot', desc: 'Choose home collection or walk-in. Pick a time that fits your schedule.' },
    { title: 'Get Your Report', desc: 'Receive your digital report securely in your dashboard within hours.' },
  ],
  popularTests: [
    { name: 'CBC Test', slug: 'cbc' },
    { name: 'Thyroid Panel', slug: 'thyroid' },
    { name: 'Vitamin D', slug: 'vitamin-d' },
    { name: 'HbA1c', slug: 'hba1c' },
    { name: 'Lipid Profile', slug: 'lipid' },
    { name: 'Liver Function', slug: 'liver' },
  ],
  trustBanner: {
    title: "India's Most Trusted Lab Booking Platform",
    subtitle: 'We partner only with NABL & CAP certified labs to ensure accurate, reliable results every time.',
    btn1Text: 'Book a Test',
    btn1Href: '/products?type=test',
    btn2Text: 'Find a Lab',
    btn2Href: '/labs',
  },
};

exports.getHomeContent = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: KEY });
  res.json(setting ? setting.value : DEFAULT_CONTENT);
});

exports.updateHomeContent = asyncHandler(async (req, res) => {
  const setting = await Setting.findOneAndUpdate(
    { key: KEY },
    { $set: { value: req.body } },
    { upsert: true, new: true }
  );
  res.json(setting.value);
});
