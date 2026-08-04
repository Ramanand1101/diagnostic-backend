const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.e2e.local') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Lab = require('../src/models/Lab');
const Product = require('../src/models/Product');
const {
  SUPERADMIN, LAB_USER, LAB_NAME, LAB_SLUG, PRODUCT_NAME, PRODUCT_SLUG, PRODUCT_PRICE, PRODUCT_SALE_PRICE,
} = require('./fixtures');

// Runs once before the whole Playwright suite (before either webServer starts
// serving real traffic) — connects DIRECTLY to the isolated `_e2e` database (never
// MONGO_URI's real cluster db, see .env.e2e.local), wipes it, and seeds a fixed,
// known-good set of fixtures every spec file can rely on existing.
module.exports = async function globalSetup() {
  const uri = process.env.MONGO_URI;
  if (!uri || !uri.includes('_e2e')) {
    throw new Error(`Refusing to run E2E global setup — MONGO_URI does not look like the isolated E2E database: ${uri}`);
  }

  await mongoose.connect(uri);
  // dropDatabase() needs an admin-level Atlas privilege this DB user doesn't have —
  // clearing every collection's documents (not the DB itself) achieves the same
  // "clean slate" without needing that privilege.
  const collections = await mongoose.connection.db.listCollections().toArray();
  await Promise.all(collections.map((c) => mongoose.connection.db.collection(c.name).deleteMany({})));

  await User.create({ name: 'E2E Superadmin', email: SUPERADMIN.email, password: SUPERADMIN.password, role: 'superadmin', verified: true });
  const labUser = await User.create({ name: 'E2E Lab Owner', email: LAB_USER.email, password: LAB_USER.password, role: 'lab', verified: true });
  const lab = await Lab.create({ name: LAB_NAME, slug: LAB_SLUG, city: 'Lucknow', approved: true, owners: [labUser._id] });
  await Product.create({
    name: PRODUCT_NAME, slug: PRODUCT_SLUG, lab: lab._id,
    price: PRODUCT_PRICE, salePrice: PRODUCT_SALE_PRICE, labPrice: 200, isActive: true,
  });

  await mongoose.disconnect();
};
