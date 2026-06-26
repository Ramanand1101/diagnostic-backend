const asyncHandler = require('express-async-handler');
const Lab = require('../models/Lab');
const Product = require('../models/Product');
const { hasAlgoliaConfig } = require('../config/algolia');
const { searchIndex, syncObjects, setIndexSettings } = require('../services/algoliaSync');

// ─── Algolia record builders ────────────────────────────────────────────────

function labRecord(lab) {
  return {
    objectID: String(lab._id),
    id: String(lab._id),
    name: lab.name,
    slug: lab.slug,
    city: lab.city,
    state: lab.state || '',
    address: lab.address || '',
    description: lab.description || '',
    ratingAvg: lab.ratingAvg || 0,
    reviewCount: lab.reviewCount || 0,
    homeCollection: !!lab.homeCollection,
    approved: !!lab.approved,
    featured: !!lab.featured,
    verificationStatus: lab.verificationStatus || 'pending',
    sampleCollectionTime: lab.sampleCollectionTime || '',
    reportDeliveryTime: lab.reportDeliveryTime || '',
    accreditation: lab.accreditation || [],
    badges: lab.badges || [],
    _geoloc: (lab.lat && lab.lng) ? { lat: lab.lat, lng: lab.lng } : undefined,
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
    sampleType: p.sampleType || '',
    homeCollection: !!p.homeCollection,
    fastingRequired: !!p.fastingRequired,
    tags: p.tags || [],
    category: p.category ? String(p.category) : null,
    lab: p.lab ? String(p.lab) : null,
    isFeatured: !!p.isFeatured,
    isActive: !!p.isActive,
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
    isPublished: !!page.isPublished,
  };
}

// Escape string for safe use in RegExp
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── MongoDB fallback search ─────────────────────────────────────────────────

async function mongoSearch(q, type, city, limit) {
  const regex = new RegExp(escapeRegex(q), 'i');
  const cityRegex = city ? new RegExp(escapeRegex(city), 'i') : null;
  const result = { labs: [], products: [], pages: [] };

  // When city is given, find matching lab IDs once and reuse for both labs + products
  let cityLabIds = null;
  if (cityRegex) {
    const cityLabs = await Lab.find({ city: cityRegex, approved: true }).select('_id').lean();
    cityLabIds = cityLabs.map((l) => l._id);
  }

  if (type === 'all' || type === 'labs') {
    const filter = {
      approved: true,
      $or: [
        { name: regex }, { city: regex },
        { description: regex }, { address: regex },
        { badges: regex }, { accreditation: regex },
      ],
    };
    if (cityRegex) filter.city = cityRegex;
    result.labs = await Lab.find(filter).limit(limit).lean();
  }

  if (type === 'all' || type === 'products') {
    const filter = {
      isActive: true,
      $or: [
        { name: regex }, { description: regex },
        { tags: regex }, { sampleType: regex },
      ],
    };
    if (cityLabIds) filter.lab = { $in: cityLabIds };
    result.products = await Product.find(filter)
      .populate('lab', 'name slug city')
      .limit(limit)
      .lean();
  }

  if (type === 'all' || type === 'pages') {
    try {
      const Page = require('../models/Page');
      result.pages = await Page.find({
        isPublished: true,
        $or: [{ title: regex }, { content: regex }],
      }).limit(limit).lean();
    } catch {
      result.pages = [];
    }
  }

  return result;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

exports.globalSearch = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const type = String(req.query.type || 'all');
  const city = String(req.query.city || '').trim();
  const limit = Math.min(Number(req.query.limit || 12), 30);

  const response = { query: q, labs: [], products: [], pages: [] };
  if (!q) return res.json(response);

  if (hasAlgoliaConfig()) {
    try {
      if (type === 'all' || type === 'labs') {
        const params = { hitsPerPage: limit, filters: 'approved:true' };
        if (city) params.optionalFilters = [`city:${city}`];
        const r = await searchIndex('labs', q, params);
        response.labs = r.hits || [];
      }
      if (type === 'all' || type === 'products') {
        const r = await searchIndex('products', q, { hitsPerPage: limit, filters: 'isActive:true' });
        response.products = r.hits || [];
      }
      if (type === 'all' || type === 'pages') {
        const r = await searchIndex('pages', q, { hitsPerPage: limit, filters: 'isPublished:true' });
        response.pages = r.hits || [];
      }
    } catch (algoliaErr) {
      console.warn('Algolia search failed, using MongoDB fallback:', algoliaErr.message);
      const fallback = await mongoSearch(q, type, city, limit);
      response.labs = fallback.labs;
      response.products = fallback.products;
      response.pages = fallback.pages;
    }
  } else {
    const fallback = await mongoSearch(q, type, city, limit);
    response.labs = fallback.labs;
    response.products = fallback.products;
    response.pages = fallback.pages;
  }

  res.json(response);
});

exports.reindexLabs = asyncHandler(async (req, res) => {
  const labs = await Lab.find();
  const records = labs.map(labRecord);

  await setIndexSettings('labs', {
    searchableAttributes: ['name', 'city', 'address', 'description', 'badges', 'accreditation'],
    attributesForFaceting: [
      'filterOnly(approved)', 'filterOnly(homeCollection)',
      'filterOnly(featured)', 'searchable(city)',
    ],
    customRanking: ['desc(ratingAvg)', 'desc(reviewCount)'],
  });

  await syncObjects('labs', records);
  res.json({ message: 'Labs reindexed', count: records.length });
});

exports.reindexProducts = asyncHandler(async (req, res) => {
  const products = await Product.find();
  const records = products.map(productRecord);

  await setIndexSettings('products', {
    searchableAttributes: ['name', 'description', 'tags', 'type', 'sampleType'],
    attributesForFaceting: [
      'filterOnly(type)', 'filterOnly(homeCollection)',
      'filterOnly(fastingRequired)', 'filterOnly(isFeatured)',
    ],
    customRanking: ['asc(price)'],
  });

  await syncObjects('products', records);
  res.json({ message: 'Products reindexed', count: records.length });
});

exports.reindexPages = asyncHandler(async (req, res) => {
  const Page = require('../models/Page');
  const pages = await Page.find({ isPublished: true });
  const records = pages.map(pageRecord);

  await setIndexSettings('pages', {
    searchableAttributes: ['title', 'seoTitle', 'seoDescription', 'content'],
    attributesForFaceting: ['filterOnly(isPublished)'],
  });

  await syncObjects('pages', records);
  res.json({ message: 'Pages reindexed', count: records.length });
});
