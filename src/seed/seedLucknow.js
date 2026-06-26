/**
 * Lucknow Labs Seed
 * Adds 5 labs in Lucknow with the SAME tests at DIFFERENT prices.
 * Run: node src/seed/seedLucknow.js
 * Safe: does NOT delete any existing data.
 */

require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Lab = require('../models/Lab');
const Product = require('../models/Product');
const Category = require('../models/Category');
const makeSlug = require('../utils/slug');

// ─── 5 Lucknow labs ──────────────────────────────────────────────────────────

const LUCKNOW_LABS = [
  {
    email: 'pathcare@lucknow.in',
    name: 'Pathcare Labs',
    address: '9 Shahnajaf Road, Hazratganj, Lucknow',
    pincode: '226001', phone: '0522-4000001',
    lat: 26.8467, lng: 80.9462,
    ratingAvg: 4.3, reviewCount: 122,
    accreditation: ['NABL'],
    badges: ['NABL Certified', 'Home Collection'],
    reportDeliveryTime: '24 hours',
    description: 'Trusted Lucknow diagnostic chain covering health tests and preventive packages.',
  },
  {
    email: 'apollo@lucknow.in',
    name: 'Apollo Diagnostics Lucknow',
    address: '12 Vipin Khand, Gomti Nagar, Lucknow',
    pincode: '226010', phone: '0522-4000002',
    lat: 26.8555, lng: 81.0047,
    ratingAvg: 4.7, reviewCount: 289,
    accreditation: ['NABL', 'CAP'],
    badges: ['NABL Certified', 'CAP Accredited', 'Home Collection'],
    reportDeliveryTime: 'Same day',
    description: 'Apollo-certified diagnostic lab with 300+ tests and same-day digital reports in Lucknow.',
  },
  {
    email: 'lalpathlab@lucknow.in',
    name: 'Dr Lal PathLabs Lucknow',
    address: '3A Sapru Marg, Hazratganj, Lucknow',
    pincode: '226001', phone: '0522-4000003',
    lat: 26.8520, lng: 80.9431,
    ratingAvg: 4.8, reviewCount: 412,
    accreditation: ['NABL', 'CAP', 'WHO'],
    badges: ['NABL Certified', 'WHO Approved', 'Same Day Reports'],
    reportDeliveryTime: 'Same day',
    description: 'India\'s largest diagnostic chain. NABL, CAP & WHO accredited lab in Hazratganj, Lucknow.',
  },
  {
    email: 'metropolis@lucknow.in',
    name: 'Metropolis Healthcare Lucknow',
    address: 'Plot 7, Sector C, Aliganj, Lucknow',
    pincode: '226024', phone: '0522-4000004',
    lat: 26.8763, lng: 80.9956,
    ratingAvg: 4.5, reviewCount: 198,
    accreditation: ['NABL', 'ISO 15189'],
    badges: ['NABL Certified', 'ISO 15189', 'Home Collection'],
    reportDeliveryTime: '24 hours',
    description: 'Metropolis Healthcare brings 4000+ tests and precision diagnostics to Aliganj, Lucknow.',
  },
  {
    email: 'srl@lucknow.in',
    name: 'SRL Diagnostics Lucknow',
    address: '22 Butler Palace Colony, Cantt, Lucknow',
    pincode: '226002', phone: '0522-4000005',
    lat: 26.8376, lng: 80.9209,
    ratingAvg: 4.4, reviewCount: 163,
    accreditation: ['NABL', 'ISO 9001'],
    badges: ['NABL Certified', 'ISO 9001', 'Budget Friendly'],
    reportDeliveryTime: '24 hours',
    description: 'Affordable NABL-certified lab at Cantt with home collection across Lucknow.',
  },
];

// ─── Common tests — same across all 5 labs, different price per lab ──────────
// priceMatrix[testIdx][labIdx] = { price, salePrice }

const COMMON_TESTS = [
  {
    type: 'test', catName: 'Blood Tests',
    name: 'CBC Blood Test', sampleType: 'Blood', reportTime: '4 hours',
    fastingRequired: false, homeCollection: true,
    description: 'Complete Blood Count: measures RBC, WBC, haemoglobin and platelets.',
    tags: ['CBC', 'Complete Blood Count', 'Haemoglobin', 'WBC', 'RBC', 'Platelet Count'],
    prices: [
      { price: 350, salePrice: 299 },   // Pathcare
      { price: 450, salePrice: 399 },   // Apollo
      { price: 399, salePrice: 349 },   // Dr Lal
      { price: 479, salePrice: 429 },   // Metropolis
      { price: 299, salePrice: 249 },   // SRL
    ],
  },
  {
    type: 'test', catName: 'Diabetes & Thyroid',
    name: 'Thyroid Profile T3 T4 TSH', sampleType: 'Blood', reportTime: '24 hours',
    fastingRequired: false, homeCollection: true,
    description: 'Evaluates thyroid gland function; detects hypo and hyperthyroidism.',
    tags: ['Thyroid', 'TSH', 'T3 Test', 'T4 Test', 'Hormones', 'Fast Reporting'],
    prices: [
      { price: 750, salePrice: 649 },
      { price: 899, salePrice: 799 },
      { price: 799, salePrice: 699 },
      { price: 849, salePrice: 749 },
      { price: 699, salePrice: 599 },
    ],
  },
  {
    type: 'test', catName: 'Diabetes & Thyroid',
    name: 'HbA1c Glycosylated Haemoglobin', sampleType: 'Blood', reportTime: '24 hours',
    fastingRequired: false, homeCollection: true,
    description: 'Reflects average blood sugar over the past 3 months. Essential for diabetes monitoring.',
    tags: ['HbA1c', 'Diabetes', 'Blood Sugar', 'Glycated', 'A1c'],
    prices: [
      { price: 550, salePrice: 499 },
      { price: 650, salePrice: 599 },
      { price: 599, salePrice: 549 },
      { price: 629, salePrice: 579 },
      { price: 499, salePrice: 449 },
    ],
  },
  {
    type: 'test', catName: 'Cardiac Health',
    name: 'Lipid Profile Cholesterol', sampleType: 'Blood', reportTime: '24 hours',
    fastingRequired: true, homeCollection: true,
    description: 'Measures total cholesterol, LDL, HDL and triglycerides for cardiac health.',
    tags: ['Lipid Profile', 'Cholesterol', 'LDL', 'HDL', 'Triglycerides', 'Cardiac'],
    prices: [
      { price: 550, salePrice: 449 },
      { price: 699, salePrice: 599 },
      { price: 649, salePrice: 549 },
      { price: 679, salePrice: 579 },
      { price: 499, salePrice: 399 },
    ],
  },
  {
    type: 'test', catName: 'Liver & Kidney Function',
    name: 'Liver Function Test LFT', sampleType: 'Blood', reportTime: '12 hours',
    fastingRequired: false, homeCollection: true,
    description: 'Assesses liver health via SGOT, SGPT, bilirubin and alkaline phosphatase.',
    tags: ['LFT', 'Liver', 'SGPT', 'SGOT', 'Bilirubin'],
    prices: [
      { price: 649, salePrice: 549 },
      { price: 799, salePrice: 699 },
      { price: 749, salePrice: 649 },
      { price: 779, salePrice: 679 },
      { price: 599, salePrice: 499 },
    ],
  },
  {
    type: 'test', catName: 'Vitamins & Minerals',
    name: 'Vitamin D 25 OH Total', sampleType: 'Blood', reportTime: '24 hours',
    fastingRequired: false, homeCollection: true,
    description: 'Detects vitamin D deficiency linked to bone loss, fatigue and low immunity.',
    tags: ['Vitamin D', 'Bone Health', 'Deficiency', 'Immunity', 'Calcium'],
    prices: [
      { price: 950, salePrice: 799 },
      { price: 1199, salePrice: 999 },
      { price: 1099, salePrice: 899 },
      { price: 1149, salePrice: 949 },
      { price: 849, salePrice: 699 },
    ],
  },
  {
    type: 'package', catName: 'Health Packages',
    name: 'Full Body Checkup', sampleType: 'Blood', reportTime: '24 hours',
    fastingRequired: true, homeCollection: true,
    description: 'Comprehensive health screening package for preventive care.',
    tags: ['Complete Blood Count', 'Liver Function Test', 'Kidney Function Test', 'Lipid Profile'],
    prices: [
      { price: 1499, salePrice: 999 },
      { price: 1999, salePrice: 1499 },
      { price: 1799, salePrice: 1299 },
      { price: 1899, salePrice: 1399 },
      { price: 1299, salePrice: 899 },
    ],
  },
  {
    type: 'package', catName: 'Health Packages',
    name: 'Diabetes Management Package', sampleType: 'Blood', reportTime: '24 hours',
    fastingRequired: true, homeCollection: true,
    description: 'HbA1c, fasting glucose, kidney and lipid panel to manage diabetes comprehensively.',
    tags: ['HbA1c', 'Fasting Sugar', 'Kidney Function', 'Lipid Profile', 'Certified Report'],
    prices: [
      { price: 1799, salePrice: 1299 },
      { price: 2199, salePrice: 1699 },
      { price: 1999, salePrice: 1499 },
      { price: 2099, salePrice: 1599 },
      { price: 1599, salePrice: 1199 },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  await connectDB();

  // Ensure categories exist
  const categoryMap = {};
  const catNames = [...new Set(COMMON_TESTS.map((t) => t.catName))];
  for (const name of catNames) {
    const slug = makeSlug(name);
    const cat = await Category.findOneAndUpdate(
      { slug },
      { name, slug, type: name === 'Health Packages' ? 'package' : 'test' },
      { upsert: true, new: true }
    );
    categoryMap[name] = cat._id;
  }

  for (let labIdx = 0; labIdx < LUCKNOW_LABS.length; labIdx++) {
    const def = LUCKNOW_LABS[labIdx];

    // Upsert user
    let user = await User.findOne({ email: def.email });
    if (!user) {
      user = await User.create({
        name: def.name, email: def.email,
        mobile: `900001000${labIdx + 1}`,
        password: 'Lab@1234', role: 'lab',
        verified: true, isActive: true,
      });
    }

    // Upsert lab
    const slug = makeSlug(def.name);
    const lab = await Lab.findOneAndUpdate(
      { slug },
      {
        owner: user._id,
        name: def.name, slug,
        description: def.description,
        address: def.address, city: 'Lucknow', state: 'Uttar Pradesh',
        pincode: def.pincode, phone: def.phone, email: def.email,
        lat: def.lat, lng: def.lng,
        homeCollection: true,
        reportDeliveryTime: def.reportDeliveryTime,
        accreditation: def.accreditation,
        badges: def.badges,
        ratingAvg: def.ratingAvg, reviewCount: def.reviewCount,
        featured: true,
        approved: true, verificationStatus: 'verified',
        seoTitle: `${def.name} | Diagnostic Lab in Lucknow`,
        seoDescription: def.description,
        serviceAreas: [{ city: 'Lucknow', radiusKm: 20 }],
      },
      { upsert: true, new: true }
    );

    // Remove old products for this lab and re-create with correct prices
    await Product.deleteMany({ lab: lab._id });

    for (let testIdx = 0; testIdx < COMMON_TESTS.length; testIdx++) {
      const tpl = COMMON_TESTS[testIdx];
      const { price, salePrice } = tpl.prices[labIdx];
      const productSlug = `${makeSlug(tpl.name)}-${slug}`;
      await Product.create({
        type: tpl.type, name: tpl.name, slug: productSlug,
        category: categoryMap[tpl.catName],
        lab: lab._id,
        description: tpl.description,
        price, salePrice,
        sampleType: tpl.sampleType, reportTime: tpl.reportTime,
        fastingRequired: tpl.fastingRequired, homeCollection: tpl.homeCollection,
        tags: tpl.tags,
        isActive: true, isFeatured: true,
        seoTitle: `${tpl.name} in Lucknow | ${def.name}`,
        seoDescription: tpl.description,
      });
    }

    console.log(`✓ ${def.name} — ${COMMON_TESTS.length} tests seeded`);
  }

  // Algolia sync if configured
  const { hasAlgoliaConfig } = require('../config/algolia');
  if (hasAlgoliaConfig()) {
    const { syncObjects } = require('../services/algoliaSync');
    const labs = await Lab.find({ city: 'Lucknow' }).lean();
    await syncObjects('labs', labs.map((l) => ({
      objectID: String(l._id), name: l.name, slug: l.slug,
      city: l.city, state: l.state, address: l.address || '',
      description: l.description || '', ratingAvg: l.ratingAvg || 0,
      reviewCount: l.reviewCount || 0, homeCollection: !!l.homeCollection,
      approved: !!l.approved, featured: !!l.featured,
      verificationStatus: l.verificationStatus,
      reportDeliveryTime: l.reportDeliveryTime || '',
      accreditation: l.accreditation || [], badges: l.badges || [],
      _geoloc: (l.lat && l.lng) ? { lat: l.lat, lng: l.lng } : undefined,
    })));

    const lucknowLabs = labs.map((l) => l._id);
    const products = await Product.find({ lab: { $in: lucknowLabs } }).lean();
    await syncObjects('products', products.map((p) => ({
      objectID: String(p._id), name: p.name, slug: p.slug, type: p.type,
      description: p.description || '', price: p.price, salePrice: p.salePrice || null,
      reportTime: p.reportTime || '', sampleType: p.sampleType || '',
      homeCollection: !!p.homeCollection, fastingRequired: !!p.fastingRequired,
      tags: p.tags || [], lab: p.lab ? String(p.lab) : null,
      isFeatured: !!p.isFeatured, isActive: !!p.isActive,
    })));
    console.log('✓ Synced to Algolia');
  }

  console.log('\n✅ Lucknow seed complete!');
  console.log('─────────────────────────────────────────');
  console.log('5 Labs in Lucknow, each with 8 tests at different prices:');
  LUCKNOW_LABS.forEach((l, i) => console.log(`  ${i + 1}. ${l.name} — ${l.email} / Lab@1234`));
  console.log('─────────────────────────────────────────');
  process.exit(0);
})();
