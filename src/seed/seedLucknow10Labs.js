/**
 * Seed: 10 Lucknow Labs
 * Creates / upserts 10 diagnostic labs in Lucknow with realistic data.
 * Run: node src/seed/seedLucknow10Labs.js
 * Safe: uses upsert — will NOT duplicate existing labs.
 */

require('dotenv').config();
const connectDB = require('../config/db');
const User      = require('../models/User');
const Lab       = require('../models/Lab');
const makeSlug  = require('../utils/slug');

const LABS = [
  // ── existing 5 (kept for idempotency) ──────────────────────────────────────
  {
    email: 'pathcare@lucknow.in',
    name: 'Pathcare Labs Lucknow',
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
    description: 'Apollo-certified diagnostic lab with 400+ tests and same-day digital reports.',
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
    description: "India's largest diagnostic chain. NABL, CAP & WHO accredited lab in Hazratganj.",
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
    description: 'Metropolis Healthcare brings 4000+ tests and precision diagnostics to Aliganj.',
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
  // ── 5 new labs ─────────────────────────────────────────────────────────────
  {
    email: 'thyrocare@lucknow.in',
    name: 'Thyrocare Technologies Lucknow',
    address: 'A-42 Sector J, Aliganj, Lucknow',
    pincode: '226024', phone: '0522-4000006',
    lat: 26.8800, lng: 80.9900,
    ratingAvg: 4.6, reviewCount: 347,
    accreditation: ['NABL', 'CAP'],
    badges: ['NABL Certified', 'Lowest Prices', 'Home Collection'],
    reportDeliveryTime: 'Same day',
    description: 'Thyrocare — the low-cost volume diagnostic chain now in Aliganj, Lucknow.',
  },
  {
    email: 'aggarwal@lucknow.in',
    name: 'Aggarwal Diagnostics Lucknow',
    address: '14 Mahanagar Extension, Lucknow',
    pincode: '226006', phone: '0522-4000007',
    lat: 26.8726, lng: 80.9700,
    ratingAvg: 4.2, reviewCount: 89,
    accreditation: ['NABL'],
    badges: ['NABL Certified', 'Budget Friendly', 'Home Collection'],
    reportDeliveryTime: '24 hours',
    description: 'Local trusted NABL lab at Mahanagar with affordable pricing and quick reports.',
  },
  {
    email: 'medanta@lucknow.in',
    name: 'Medanta Diagnostics Lucknow',
    address: 'B-1 Vibhuti Khand, Gomti Nagar, Lucknow',
    pincode: '226010', phone: '0522-4000008',
    lat: 26.8620, lng: 81.0250,
    ratingAvg: 4.9, reviewCount: 521,
    accreditation: ['NABL', 'CAP', 'ISO 15189'],
    badges: ['NABL Certified', 'CAP Accredited', 'Hospital Grade', 'Home Collection'],
    reportDeliveryTime: 'Same day',
    description: 'Medanta hospital-grade diagnostics with 500+ tests at Gomti Nagar, Lucknow.',
  },
  {
    email: 'redcliffe@lucknow.in',
    name: 'Redcliffe Labs Lucknow',
    address: '33 Indira Nagar Colony, Lucknow',
    pincode: '226016', phone: '0522-4000009',
    lat: 26.8900, lng: 81.0030,
    ratingAvg: 4.4, reviewCount: 203,
    accreditation: ['NABL', 'ISO 9001'],
    badges: ['NABL Certified', 'Home Collection', 'Digital Reports'],
    reportDeliveryTime: '24 hours',
    description: 'Redcliffe Labs — tech-first diagnostics with digital reports at Indira Nagar.',
  },
  {
    email: 'vijay@lucknow.in',
    name: 'Vijay Diagnostics Lucknow',
    address: '7 Rajajipuram Market, Lucknow',
    pincode: '226017', phone: '0522-4000010',
    lat: 26.8500, lng: 80.8980,
    ratingAvg: 4.1, reviewCount: 74,
    accreditation: ['NABL'],
    badges: ['NABL Certified', 'Budget Friendly'],
    reportDeliveryTime: '24 hours',
    description: 'Budget-friendly NABL lab at Rajajipuram serving west Lucknow since 2005.',
  },
];

(async () => {
  await connectDB();

  for (let i = 0; i < LABS.length; i++) {
    const def  = LABS[i];
    const slug = makeSlug(def.name);

    // Upsert owner user
    let user = await User.findOne({ email: def.email });
    if (!user) {
      user = await User.create({
        name: def.name,
        email: def.email,
        mobile: `900010000${String(i + 1).padStart(1, '0')}`,
        password: 'Lab@1234',
        role: 'lab',
        verified: true,
        isActive: true,
      });
    }

    await Lab.findOneAndUpdate(
      { slug },
      {
        owner: user._id,
        name: def.name, slug,
        description: def.description,
        address: def.address,
        city: 'Lucknow', state: 'Uttar Pradesh',
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

    console.log(`✓ ${def.name}`);
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
    console.log('✓ Synced labs to Algolia');
  }

  console.log('\n✅ 10 Lucknow labs seeded!');
  LABS.forEach((l, i) => console.log(`  ${i + 1}. ${l.name} — ${l.email} / Lab@1234`));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
