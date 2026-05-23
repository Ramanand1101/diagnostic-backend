require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const Category = require('../models/Category');
const Lab = require('../models/Lab');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const Page = require('../models/Page');
const Blog = require('../models/Blog');
const makeSlug = require('../utils/slug');

(async () => {
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Lab.deleteMany({}),
    Product.deleteMany({}),
    Coupon.deleteMany({}),
    Page.deleteMany({}),
    Blog.deleteMany({})
  ]);

  const superadmin = await User.create({
    name: 'Super Admin',
    email: 'admin@example.com',
    mobile: '9999999999',
    password: 'Admin@123',
    role: 'superadmin',
    verified: true
  });

  const labUser = await User.create({
    name: 'Demo Lab',
    email: 'lab@example.com',
    mobile: '8888888888',
    password: 'Lab@1234',
    role: 'lab',
    verified: true
  });

  const category = await Category.create({
    name: 'Blood Test',
    slug: makeSlug('Blood Test'),
    type: 'test',
    seoTitle: 'Blood Test',
    seoDescription: 'Blood tests'
  });

  const lab = await Lab.create({
    owner: labUser._id,
    name: 'City Diagnostics',
    slug: makeSlug('City Diagnostics'),
    city: 'Delhi',
    state: 'Delhi',
    phone: '01111111111',
    email: 'info@citydiagnostics.in',
    address: 'Delhi NCR',
    approved: true,
    verificationStatus: 'verified',
    homeCollection: true,
    ratingAvg: 4.6,
    sampleCollectionTime: '60 mins',
    reportDeliveryTime: '24 hours'
  });

  await Product.create([
    {
      type: 'test',
      name: 'Complete Blood Count',
      slug: makeSlug('Complete Blood Count'),
      category: category._id,
      lab: lab._id,
      price: 499,
      salePrice: 399,
      reportTime: '24 hours',
      homeCollection: true,
      fastingRequired: false,
      brand: 'Generic',
      description: 'CBC test',
      tags: ['blood', 'routine', 'screening']
    },
    {
      type: 'package',
      name: 'Full Body Checkup',
      slug: makeSlug('Full Body Checkup'),
      category: category._id,
      lab: lab._id,
      price: 1999,
      salePrice: 1499,
      reportTime: '24 hours',
      homeCollection: true,
      fastingRequired: true,
      brand: 'Premium',
      description: 'Complete health package',
      tags: ['health', 'package']
    },
    {
      type: 'medicine',
      name: 'Vitamin D3',
      slug: makeSlug('Vitamin D3'),
      category: category._id,
      lab: lab._id,
      price: 299,
      reportTime: 'N/A',
      homeCollection: false,
      brand: 'Wellness',
      description: 'Supplement listing placeholder',
      tags: ['medicine']
    }
  ]);

  await Coupon.create({
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    minOrderAmount: 500,
    maxDiscount: 300,
    active: true
  });

  await Page.create([
    {
      title: 'About Us',
      slug: 'about-us',
      content: 'About page content',
      seoTitle: 'About Us'
    },
    {
      title: 'Terms',
      slug: 'terms',
      content: 'Terms content',
      seoTitle: 'Terms'
    }
  ]);

  await Blog.create({
    title: 'Why Annual Health Checkups Matter',
    slug: makeSlug('Why Annual Health Checkups Matter'),
    excerpt: 'SEO blog starter',
    content: 'Blog content',
    tags: ['health', 'seo']
  });

  console.log('Seed completed');
  process.exit(0);
})();
