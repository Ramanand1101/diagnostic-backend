require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const CATEGORIES = [
  { name: 'Pathology', slug: 'pathology', parent: null, isActive: true },
  { name: 'Radiology', slug: 'radiology', parent: null, isActive: true },
  { name: 'Packages',  slug: 'packages',  parent: null, isActive: true },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Category.deleteMany({});
  await Category.insertMany(CATEGORIES);
  console.log('Categories reset: Pathology, Radiology, Packages');
  await mongoose.disconnect();
})();
