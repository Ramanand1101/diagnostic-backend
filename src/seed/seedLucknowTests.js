/**
 * Seed: All Lucknow lab tests (601 tests × 10 labs = ~6010 products)
 * Uses batch insertMany to avoid Atlas connection timeouts.
 * Run seedLucknow10Labs.js first to ensure all 10 labs exist.
 * Run: node src/seed/seedLucknowTests.js
 */

require('dotenv').config();
const connectDB = require('../config/db');
const Lab       = require('../models/Lab');
const Product   = require('../models/Product');
const Category  = require('../models/Category');
const makeSlug  = require('../utils/slug');
const {
  RAW_TESTS, roundPrice, getCategory,
  getSampleType, isFasting, isHomeCollection, getDesc, getReportTime,
} = require('../data/lucknowTestsData');

const LAB_EMAILS = [
  'pathcare@lucknow.in',
  'apollo@lucknow.in',
  'lalpathlab@lucknow.in',
  'metropolis@lucknow.in',
  'srl@lucknow.in',
  'thyrocare@lucknow.in',
  'aggarwal@lucknow.in',
  'medanta@lucknow.in',
  'redcliffe@lucknow.in',
  'vijay@lucknow.in',
];
const MULTIPLIERS = [0.85, 1.00, 0.92, 1.08, 0.88, 0.78, 0.72, 1.18, 0.82, 0.76];
const DISCOUNT    = 0.85;
const BATCH_SIZE  = 500;

async function main() {
  await connectDB();

  // ── 1. Resolve labs ──────────────────────────────────────────────────────────
  const labs = await Promise.all(LAB_EMAILS.map((e) => Lab.findOne({ email: e })));
  const missing = LAB_EMAILS.filter((e, i) => !labs[i]);
  if (missing.length) {
    console.error('Missing labs:', missing);
    console.error('Run: node src/seed/seedLucknow10Labs.js first');
    process.exit(1);
  }
  console.log(`Found ${labs.length} labs`);

  // ── 2. Upsert categories ─────────────────────────────────────────────────────
  const catNames = [...new Set(RAW_TESTS.map(([name]) => getCategory(name)))];
  const catMap = {};
  for (const catName of catNames) {
    let cat = await Category.findOne({ name: catName });
    if (!cat) cat = await Category.create({ name: catName, slug: makeSlug(catName), type: 'test' });
    catMap[catName] = cat._id;
  }
  console.log(`Upserted ${catNames.length} categories`);

  // ── 3. Pre-fetch existing slugs (single query) ───────────────────────────────
  const labIds = labs.map((l) => l._id);
  const existingSlugs = new Set(
    (await Product.find({ lab: { $in: labIds } }).select('slug').lean()).map((p) => p.slug)
  );
  console.log(`${existingSlugs.size} products already exist — will skip those`);

  // ── 4. Build all documents in memory ────────────────────────────────────────
  const docs = [];
  for (const [testName, basePrice] of RAW_TESTS) {
    const cat     = getCategory(testName);
    const catId   = catMap[cat];
    const sample  = getSampleType(testName);
    const fasting = isFasting(testName);
    const home    = isHomeCollection(testName);
    const desc    = getDesc(cat);
    const tags    = [testName.split(' ')[0], cat.split(' ')[0], sample].filter(Boolean);

    for (let i = 0; i < labs.length; i++) {
      const lab   = labs[i];
      const price = roundPrice(basePrice * MULTIPLIERS[i]);
      const sale  = roundPrice(price * DISCOUNT);
      const slug  = makeSlug(`${testName} ${lab.name}`);

      if (existingSlugs.has(slug)) continue;

      docs.push({
        name:            testName,
        slug,
        type:            'test',
        category:        catId,
        lab:             lab._id,
        description:     desc,
        price,
        salePrice:       sale < price ? sale : undefined,
        sampleType:      sample,
        fastingRequired: fasting,
        homeCollection:  home,
        reportTime:      getReportTime(basePrice),
        tags,
        isActive:        true,
        isFeatured:      false,
      });
    }
  }

  const skipped = (RAW_TESTS.length * labs.length) - docs.length;
  console.log(`Building ${docs.length} new products (${skipped} already exist)`);

  // ── 5. Insert in batches ─────────────────────────────────────────────────────
  let created = 0;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    await Product.insertMany(batch, { ordered: false });
    created += batch.length;
    process.stdout.write(`\r  Inserted ${created}/${docs.length}...`);
  }
  console.log(`\nDone — created: ${created}, skipped: ${skipped}`);

  // ── 6. Algolia sync ──────────────────────────────────────────────────────────
  const { hasAlgoliaConfig } = require('../config/algolia');
  if (hasAlgoliaConfig()) {
    const { syncObjects } = require('../services/algoliaSync');
    const products = await Product.find({ lab: { $in: labIds } }).lean();
    // Algolia saveObjects supports up to 1000 per call — chunk it
    for (let i = 0; i < products.length; i += 1000) {
      const chunk = products.slice(i, i + 1000);
      await syncObjects('products', chunk.map((p) => ({
        objectID: String(p._id), name: p.name, slug: p.slug, type: p.type,
        description: p.description || '', price: p.price, salePrice: p.salePrice || null,
        reportTime: p.reportTime || '', sampleType: p.sampleType || '',
        homeCollection: !!p.homeCollection, fastingRequired: !!p.fastingRequired,
        tags: p.tags || [], lab: p.lab ? String(p.lab) : null,
        isFeatured: !!p.isFeatured, isActive: !!p.isActive,
      })));
    }
    console.log(`Synced ${products.length} products to Algolia`);
  }

  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
