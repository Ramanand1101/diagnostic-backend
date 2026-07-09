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

// ─── Abbreviation / alias expansion ──────────────────────────────────────────

const ALIASES = {
  cbc:        ['complete blood count', 'haemogram', 'cbp'],
  lft:        ['liver function test', 'liver function'],
  kft:        ['kidney function test', 'renal function', 'renal profile'],
  rft:        ['kidney function test', 'renal function', 'renal profile'],
  tft:        ['thyroid function test', 'thyroid profile', 'thyroid'],
  tsh:        ['thyroid stimulating hormone', 'thyroid'],
  hba1c:      ['glycosylated haemoglobin', 'glycated haemoglobin', 'a1c'],
  a1c:        ['glycosylated haemoglobin', 'hba1c'],
  sugar:      ['glucose', 'blood sugar'],
  'vit d':    ['vitamin d', '25 oh', 'cholecalciferol'],
  'vit d3':   ['vitamin d3', '25 oh'],
  'vit b12':  ['vitamin b12', 'cobalamin'],
  b12:        ['vitamin b12', 'cobalamin'],
  lipid:      ['lipid profile', 'cholesterol', 'triglyceride'],
  cholesterol:['lipid profile'],
  dengue:     ['ns1', 'dengue antigen', 'dengue igg', 'dengue igm'],
  typhoid:    ['widal', 'salmonella'],
  widal:      ['typhoid', 'salmonella typhi'],
  malaria:    ['malarial parasite', 'malarial antigen', 'mp'],
  hiv:        ['retroviral', 'aids'],
  esr:        ['erythrocyte sedimentation rate'],
  crp:        ['c-reactive protein', 'c reactive protein'],
  psa:        ['prostate specific antigen', 'prostate'],
  fnac:       ['fine needle aspiration', 'cytology'],
  pregnancy:  ['beta hcg', 'hcg'],
  hcg:        ['pregnancy', 'beta hcg'],
  syphilis:   ['vdrl', 'rpr', 'tpha'],
  vdrl:       ['rpr', 'tpha', 'syphilis'],
  'hepatitis b': ['hbsag', 'hbv', 'hbs ag'],
  hbsag:      ['hepatitis b surface antigen'],
  'hepatitis c': ['hcv'],
  hcv:        ['hepatitis c'],
  pcr:        ['rt-pcr', 'molecular', 'dna test'],
  uric:       ['uric acid', 'gout'],
  creatinine: ['kidney', 'renal'],
  mantoux:    ['tuberculin', 'tb test'],
  tb:         ['tuberculosis', 'mtb', 'mantoux', 'tb gold'],
  urine:      ['urine routine', 'urine complete'],
  'blood group': ['rh typing', 'blood type'],
};

function expandQuery(q) {
  const lower = q.toLowerCase().trim();
  const extra = ALIASES[lower] || [];
  // partial-key match (e.g. "vitamin d" → "vit d")
  for (const [k, v] of Object.entries(ALIASES)) {
    if (lower.startsWith(k) || k.startsWith(lower)) extra.push(...v);
  }
  return [...new Set([lower, ...extra])];
}

// ─── Popular tests — top tests sorted by how many labs offer them ─────────────

exports.popular = asyncHandler(async (req, res) => {
  const city  = String(req.query.city  || '').trim();
  const limit = Math.min(Number(req.query.limit || 10), 20);

  let cityLabIds = null;
  if (city) {
    const cityLabs = await Lab.find({ city: new RegExp(city, 'i'), approved: true }).select('_id').lean();
    cityLabIds = cityLabs.map((l) => l._id);
    if (!cityLabIds.length) return res.json({ tests: [] });
  }

  const matchStage = { isActive: true };
  if (cityLabIds) matchStage.lab = { $in: cityLabIds };

  const grouped = await Product.aggregate([
    { $match: matchStage },
    { $group: {
      _id: '$name',
      minPrice:   { $min: { $ifNull: ['$salePrice', '$price'] } },
      maxPrice:   { $max: { $ifNull: ['$salePrice', '$price'] } },
      labCount:   { $sum: 1 },
      sampleType: { $first: '$sampleType' },
      reportTime: { $first: '$reportTime' },
      tags:       { $first: '$tags' },
    }},
    { $sort: { labCount: -1 } },
    { $limit: limit },
  ]);

  res.json({
    tests: grouped.map((g) => ({
      name:       g._id,
      minPrice:   g.minPrice,
      maxPrice:   g.maxPrice,
      labCount:   g.labCount,
      sampleType: g.sampleType || 'Blood',
      reportTime: g.reportTime || '',
    })),
  });
});

// ─── Grouped autocomplete suggest ────────────────────────────────────────────

exports.suggest = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const city = String(req.query.city || '').trim();
  const limit = Math.min(Number(req.query.limit || 10), 20);

  if (q.length < 2) return res.json({ tests: [], labs: [] });

  const terms = expandQuery(q);
  const orPatterns = terms.map((t) => ({ name: new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }));

  // Optional city filter — get lab IDs once
  let cityLabIds = null;
  if (city) {
    const cityLabs = await Lab.find({ city: new RegExp(city, 'i'), approved: true }).select('_id').lean();
    cityLabIds = cityLabs.map((l) => l._id);
    if (!cityLabIds.length) return res.json({ tests: [], labs: [] });
  }

  const matchStage = { isActive: true, $or: orPatterns };
  if (cityLabIds) matchStage.lab = { $in: cityLabIds };

  // Group by test name → min/max price, lab count
  const grouped = await Product.aggregate([
    { $match: matchStage },
    { $group: {
      _id: '$name',
      minPrice: { $min: { $ifNull: ['$salePrice', '$price'] } },
      maxPrice: { $max: { $ifNull: ['$salePrice', '$price'] } },
      labCount: { $sum: 1 },
      sampleType: { $first: '$sampleType' },
      reportTime: { $first: '$reportTime' },
    }},
    { $sort: { labCount: -1 } },
    { $limit: limit },
  ]);

  // Also fetch a few matching labs
  const labFilter = { approved: true, $or: terms.map((t) => ({ name: new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })) };
  if (city) labFilter.city = new RegExp(city, 'i');
  const labs = await Lab.find(labFilter).select('name slug city ratingAvg').limit(4).lean();

  res.json({
    tests: grouped.map((g) => ({
      name: g._id,
      minPrice: g.minPrice,
      maxPrice: g.maxPrice,
      labCount: g.labCount,
      sampleType: g.sampleType || 'Blood',
      reportTime: g.reportTime || '',
    })),
    labs,
  });
});

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
    searchableAttributes: ['name', 'tags', 'description', 'type', 'sampleType'],
    attributesForFaceting: [
      'filterOnly(type)', 'filterOnly(homeCollection)',
      'filterOnly(fastingRequired)', 'filterOnly(isFeatured)',
      'filterOnly(isActive)',
    ],
    customRanking: ['asc(price)'],
    typoTolerance: true,
    minWordSizefor1Typo: 3,
    minWordSizefor2Typos: 7,
  });

  // Push synonym rules so abbreviations resolve to full test names
  if (hasAlgoliaConfig()) {
    const { getClient, indexName } = require('../config/algolia');
    const client = getClient();
    const synonymRules = [
      { objectID: 'syn_cbc',      type: 'synonym', synonyms: ['cbc', 'complete blood count', 'haemogram', 'cbp'] },
      { objectID: 'syn_lft',      type: 'synonym', synonyms: ['lft', 'liver function test', 'liver function'] },
      { objectID: 'syn_kft',      type: 'synonym', synonyms: ['kft', 'rft', 'kidney function test', 'renal profile', 'renal function'] },
      { objectID: 'syn_thyroid',  type: 'synonym', synonyms: ['tft', 'tsh', 'thyroid', 'thyroid profile', 'thyroid function test'] },
      { objectID: 'syn_hba1c',    type: 'synonym', synonyms: ['hba1c', 'a1c', 'glycosylated haemoglobin', 'glycated haemoglobin'] },
      { objectID: 'syn_vitd',     type: 'synonym', synonyms: ['vitamin d', 'vit d', 'vit d3', '25 oh', 'cholecalciferol'] },
      { objectID: 'syn_vitb12',   type: 'synonym', synonyms: ['vitamin b12', 'vit b12', 'b12', 'cobalamin'] },
      { objectID: 'syn_lipid',    type: 'synonym', synonyms: ['lipid', 'lipid profile', 'cholesterol test', 'lipid panel'] },
      { objectID: 'syn_dengue',   type: 'synonym', synonyms: ['dengue', 'ns1', 'dengue antigen', 'dengue test'] },
      { objectID: 'syn_typhoid',  type: 'synonym', synonyms: ['typhoid', 'widal', 'salmonella'] },
      { objectID: 'syn_malaria',  type: 'synonym', synonyms: ['malaria', 'malarial', 'mp', 'malarial parasite'] },
      { objectID: 'syn_hiv',      type: 'synonym', synonyms: ['hiv', 'aids', 'retroviral'] },
      { objectID: 'syn_esr',      type: 'synonym', synonyms: ['esr', 'erythrocyte sedimentation rate'] },
      { objectID: 'syn_crp',      type: 'synonym', synonyms: ['crp', 'c reactive protein', 'c-reactive protein'] },
      { objectID: 'syn_psa',      type: 'synonym', synonyms: ['psa', 'prostate specific antigen', 'prostate test'] },
      { objectID: 'syn_uric',     type: 'synonym', synonyms: ['uric acid', 'gout test', 'urate'] },
      { objectID: 'syn_sugar',    type: 'synonym', synonyms: ['blood sugar', 'glucose', 'sugar test', 'fasting sugar'] },
      { objectID: 'syn_tb',       type: 'synonym', synonyms: ['tb', 'tuberculosis', 'mtb', 'tb pcr', 'tb gold'] },
      { objectID: 'syn_pregnancy', type: 'synonym', synonyms: ['pregnancy test', 'beta hcg', 'hcg', 'pregnancy'] },
      { objectID: 'syn_syphilis', type: 'synonym', synonyms: ['syphilis', 'vdrl', 'rpr', 'tpha'] },
      { objectID: 'syn_hepatitisb', type: 'synonym', synonyms: ['hepatitis b', 'hbsag', 'hbv', 'hbs ag'] },
      { objectID: 'syn_hepatitisc', type: 'synonym', synonyms: ['hepatitis c', 'hcv', 'hcv ab'] },
      { objectID: 'syn_pcr',      type: 'synonym', synonyms: ['pcr', 'rt-pcr', 'molecular test', 'dna test', 'rna test'] },
    ];
    await client.saveSynonyms({ indexName: indexName('products'), synonyms: synonymRules, forwardToReplicas: true });
  }

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
