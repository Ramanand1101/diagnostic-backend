const asyncHandler = require('express-async-handler');
const Lab = require('../models/Lab');
const Product = require('../models/Product');
const Page = require('../models/Page');
const { searchIndex } = require('../services/algoliaSync');

function labRecord(lab) {
  return {
    objectID: String(lab._id),
    id: String(lab._id),
    name: lab.name,
    slug: lab.slug,
    city: lab.city,
    address: lab.address,
    description: lab.description || '',
    ratingAvg: lab.ratingAvg || 0,
    reviewCount: lab.reviewCount || 0,
    homeCollection: !!lab.homeCollection,
    approved: !!lab.approved,
    featured: !!lab.featured,
    sampleCollectionTime: lab.sampleCollectionTime || '',
    reportDeliveryTime: lab.reportDeliveryTime || '',
    accreditation: lab.accreditation || [],
    badges: lab.badges || [],
    _geoloc: (lab.lat && lab.lng) ? { lat: lab.lat, lng: lab.lng } : undefined
  };
}

function productRecord(p) {
  return {
    objectID: String(p._id),
    id: String(p._id),
    type: p.type,
    name: p.name,
    slug: p.slug,
    description: p.description || '',
    price: p.price,
    salePrice: p.salePrice || null,
    discountPercent: p.discountPercent || null,
    reportTime: p.reportTime || '',
    homeCollection: !!p.homeCollection,
    fastingRequired: !!p.fastingRequired,
    brand: p.brand || '',
    tags: p.tags || [],
    category: p.category ? String(p.category) : null,
    lab: p.lab ? String(p.lab) : null,
    isFeatured: !!p.isFeatured,
    isActive: !!p.isActive
  };
}

function pageRecord(page) {
  return {
    objectID: String(page._id),
    id: String(page._id),
    title: page.title,
    slug: page.slug,
    content: page.content || '',
    seoTitle: page.seoTitle || '',
    seoDescription: page.seoDescription || '',
    isPublished: !!page.isPublished
  };
}

exports.globalSearch = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const type = String(req.query.type || 'all');
  const city = String(req.query.city || '').trim();
  const limit = Math.min(Number(req.query.limit || 10), 20);

  const response = { query: q, results: {} };

  if (!q) {
    return res.json(response);
  }

  if (type === 'all' || type === 'labs') {
    const params = {
      hitsPerPage: limit,
      filters: 'approved:true'
    };
    if (city) params.optionalFilters = [`city:${city}`];
    response.results.labs = await searchIndex('labs', q, params);
  }

  if (type === 'all' || type === 'products') {
    response.results.products = await searchIndex('products', q, {
      hitsPerPage: limit,
      filters: 'isActive:true'
    });
  }

  if (type === 'all' || type === 'pages') {
    response.results.pages = await searchIndex('pages', q, {
      hitsPerPage: limit,
      filters: 'isPublished:true'
    });
  }

  res.json(response);
});

exports.reindexLabs = asyncHandler(async (req, res) => {
  const labs = await Lab.find();
  const records = labs.map(labRecord);
  const { syncObjects, setIndexSettings } = require('../services/algoliaSync');

  await setIndexSettings('labs', {
    searchableAttributes: ['name', 'city', 'address', 'description', 'badges', 'accreditation'],
    attributesForFaceting: ['filterOnly(approved)', 'filterOnly(homeCollection)', 'filterOnly(featured)', 'searchable(city)'],
    customRanking: ['desc(ratingAvg)', 'desc(reviewCount)']
  });

  await syncObjects('labs', records);
  res.json({ message: 'Labs reindexed', count: records.length });
});

exports.reindexProducts = asyncHandler(async (req, res) => {
  const products = await Product.find();
  const records = products.map(productRecord);
  const { syncObjects, setIndexSettings } = require('../services/algoliaSync');

  await setIndexSettings('products', {
    searchableAttributes: ['name', 'brand', 'description', 'tags', 'type'],
    attributesForFaceting: ['filterOnly(type)', 'filterOnly(homeCollection)', 'filterOnly(fastingRequired)', 'filterOnly(isFeatured)', 'searchable(brand)'],
    customRanking: ['desc(price)', 'desc(discountPercent)']
  });

  await syncObjects('products', records);
  res.json({ message: 'Products reindexed', count: records.length });
});

exports.reindexPages = asyncHandler(async (req, res) => {
  const pages = await Page.find({ isPublished: true });
  const records = pages.map(pageRecord);
  const { syncObjects, setIndexSettings } = require('../services/algoliaSync');

  await setIndexSettings('pages', {
    searchableAttributes: ['title', 'seoTitle', 'seoDescription', 'content'],
    attributesForFaceting: ['filterOnly(isPublished)']
  });

  await syncObjects('pages', records);
  res.json({ message: 'Pages reindexed', count: records.length });
});
