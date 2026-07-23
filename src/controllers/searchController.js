const asyncHandler = require('express-async-handler');
const Lab = require('../models/Lab');
const Product = require('../models/Product');
const { hasAlgoliaConfig } = require('../config/algolia');
const { searchIndex, syncObjects, replaceAllObjects, setIndexSettings } = require('../services/algoliaSync');

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
  const tm = p.testMaster || {};
  return {
    objectID: String(p._id),
    id: String(p._id),
    type: p.type,
    name: p.name,
    slug: p.slug,
    description: tm.description || p.description || '',
    price: p.price,
    salePrice: p.salePrice || null,
    discountPercent: p.discountPercent || null,
    reportTime: tm.reportTime || p.reportTime || '',
    sampleType: tm.sampleType || p.sampleType || '',
    homeCollection: !!(tm.homeCollection ?? p.homeCollection),
    fastingRequired: !!(tm.fastingRequired ?? p.fastingRequired),
    tags: p.tags || [],
    category: p.category ? String(p.category) : null,
    lab: p.lab && typeof p.lab === 'object'
      ? { _id: String(p.lab._id), name: p.lab.name, slug: p.lab.slug, city: p.lab.city, state: p.lab.state || '', address: p.lab.address || '', area: p.lab.area || '', pincode: p.lab.pincode || '' }
      : (p.lab ? String(p.lab) : null),
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

  // Pre-fetch inactive brand IDs to exclude their labs
  const Brand = require('../models/Brand');
  const inactiveBrands = await Brand.find({ isActive: false }).select('_id').lean();
  const inactiveBrandIds = inactiveBrands.map((b) => b._id);

  // When city is given, find matching lab IDs once and reuse for both labs + products
  let cityLabIds = null;
  if (cityRegex) {
    const cityFilter = { city: cityRegex, approved: true };
    if (inactiveBrandIds.length) cityFilter.$or = [{ brand: { $nin: inactiveBrandIds } }, { brand: null }];
    const cityLabs = await Lab.find(cityFilter).select('_id').lean();
    cityLabIds = cityLabs.map((l) => l._id);
  }

  if (type === 'all' || type === 'labs') {
    const filter = {
      approved: true,
      name: regex, // match only on lab name
    };
    if (inactiveBrandIds.length) filter.$or = [{ brand: { $nin: inactiveBrandIds } }, { brand: null }];
    if (cityRegex) filter.city = cityRegex;
    result.labs = await Lab.find(filter).populate('brand', 'name slug logo').limit(limit).lean();
  }

  if (type === 'all' || type === 'products') {
    const labPopulate = {
      path: 'lab',
      select: 'name slug city state address area pincode homeCollection ratingAvg verificationStatus accreditation brand',
      populate: { path: 'brand', select: 'name slug logo' },
    };
    const tmPopulate = { path: 'testMaster', select: 'name description sampleType reportTime fastingRequired homeCollection' };
    const baseFilter = { isActive: true, ...(cityLabIds ? { lab: { $in: cityLabIds } } : {}) };

    const exactRegex   = new RegExp(`^${escapeRegex(q)}$`, 'i');
    const prefixRegex  = new RegExp(`^${escapeRegex(q)}`,  'i');
    const partialRegex = new RegExp(escapeRegex(q), 'i');

    let products = await Product.find({ ...baseFilter, name: exactRegex }).populate(labPopulate).populate(tmPopulate).limit(limit).lean();
    if (!products.length)
      products = await Product.find({ ...baseFilter, name: prefixRegex }).populate(labPopulate).populate(tmPopulate).limit(limit).lean();
    if (!products.length)
      products = await Product.find({ ...baseFilter, name: partialRegex }).populate(labPopulate).populate(tmPopulate).limit(limit).lean();

    result.products = products;
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

  const Brand = require('../models/Brand');
  const inactiveBrands = await Brand.find({ isActive: false }).select('_id').lean();
  const inactiveBrandIds = inactiveBrands.map((b) => b._id);

  let cityLabIds = null;
  if (city) {
    const cityFilter = { city: new RegExp(city, 'i'), approved: true };
    if (inactiveBrandIds.length) cityFilter.$or = [{ brand: { $nin: inactiveBrandIds } }, { brand: null }];
    const cityLabs = await Lab.find(cityFilter).select('_id').lean();
    cityLabIds = cityLabs.map((l) => l._id);
    // If no labs found in city, fall back to all cities (don't show empty)
  }

  const matchStage = { isActive: true };
  if (cityLabIds && cityLabIds.length) matchStage.lab = { $in: cityLabIds };

  const grouped = await Product.aggregate([
    { $match: matchStage },
    { $lookup: { from: 'testmasters', localField: 'testMaster', foreignField: '_id', as: 'tm' } },
    { $unwind: { path: '$tm', preserveNullAndEmptyArrays: true } },
    { $group: {
      _id: '$name',
      minPrice:   { $min: { $ifNull: ['$salePrice', '$price'] } },
      maxPrice:   { $max: { $ifNull: ['$salePrice', '$price'] } },
      labCount:   { $sum: 1 },
      sampleType: { $first: { $ifNull: ['$tm.sampleType', '$sampleType'] } },
      reportTime: { $first: { $ifNull: ['$tm.reportTime', '$reportTime'] } },
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

  const Brand = require('../models/Brand');
  const inactiveBrands = await Brand.find({ isActive: false }).select('_id').lean();
  const inactiveBrandIds = inactiveBrands.map((b) => b._id);

  const terms = expandQuery(q);
  const orPatterns = terms.map((t) => ({ name: new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }));

  let cityLabIds = null;
  if (city) {
    const cityFilter = { city: new RegExp(city, 'i'), approved: true };
    if (inactiveBrandIds.length) cityFilter.$or = [{ brand: { $nin: inactiveBrandIds } }, { brand: null }];
    const cityLabs = await Lab.find(cityFilter).select('_id').lean();
    cityLabIds = cityLabs.map((l) => l._id);
    // If no labs in city, fall back to all (don't return empty)
  }

  const matchStage = { isActive: true, $or: orPatterns };
  if (cityLabIds && cityLabIds.length) matchStage.lab = { $in: cityLabIds };

  const grouped = await Product.aggregate([
    { $match: matchStage },
    { $lookup: { from: 'testmasters', localField: 'testMaster', foreignField: '_id', as: 'tm' } },
    { $unwind: { path: '$tm', preserveNullAndEmptyArrays: true } },
    { $group: {
      _id: '$name',
      minPrice:   { $min: { $ifNull: ['$salePrice', '$price'] } },
      maxPrice:   { $max: { $ifNull: ['$salePrice', '$price'] } },
      labCount:   { $sum: 1 },
      sampleType: { $first: { $ifNull: ['$tm.sampleType', '$sampleType'] } },
      reportTime: { $first: { $ifNull: ['$tm.reportTime', '$reportTime'] } },
    }},
    { $sort: { labCount: -1 } },
    { $limit: limit },
  ]);

  // Also fetch a few matching labs (exclude inactive brands)
  const labFilter = { approved: true, $or: terms.map((t) => ({ name: new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })) };
  if (city) labFilter.city = new RegExp(city, 'i');
  if (inactiveBrandIds.length) labFilter.$and = [{ $or: [{ brand: { $nin: inactiveBrandIds } }, { brand: null }] }];
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
        const params = { hitsPerPage: limit };
        if (city) params.optionalFilters = [`city:${city}`];
        const r = await searchIndex('labs', q, params);
        // filter in JS — approved facet may or may not be configured in Algolia
        response.labs = (r.hits || []).filter((l) => l.approved !== false);
      }
      if (type === 'all' || type === 'products') {
        // fetch extra so JS filtering still returns enough results
        const r = await searchIndex('products', q, {
          hitsPerPage: limit * 2,
          typoTolerance: false,       // no fuzzy matching — exact/prefix only
          queryType: 'prefixLast',    // prefix allowed only on the last word
        });
        const hits = (r.hits || []).filter((p) => p.isActive !== false).slice(0, limit);
        // If lab is stored as a bare ObjectID string (not populated), Algolia data is stale — use MongoDB
        const needsReindex = hits.length > 0 && hits.some((p) => typeof p.lab === 'string');
        if (needsReindex) {
          const fallback = await mongoSearch(q, 'products', city, limit);
          response.products = fallback.products;
        } else {
          response.products = hits;
        }
      }
      if (type === 'all' || type === 'pages') {
        const r = await searchIndex('pages', q, { hitsPerPage: limit });
        response.pages = (r.hits || []).filter((p) => p.isPublished !== false);
      }
      // If Algolia returned nothing at all, fall back to MongoDB (handles un-indexed state)
      if (response.products.length === 0 && response.labs.length === 0) {
        const fallback = await mongoSearch(q, type, city, limit);
        response.labs = fallback.labs;
        response.products = fallback.products;
        response.pages = fallback.pages;
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
  const count = await _doReindexLabs();
  res.json({ message: 'Labs reindexed', count });
});

const SYNONYM_RULES = [
  { objectID: 'syn_cbc',        type: 'synonym', synonyms: ['cbc', 'complete blood count', 'haemogram', 'cbp'] },
  { objectID: 'syn_lft',        type: 'synonym', synonyms: ['lft', 'liver function test', 'liver function'] },
  { objectID: 'syn_kft',        type: 'synonym', synonyms: ['kft', 'rft', 'kidney function test', 'renal profile', 'renal function'] },
  { objectID: 'syn_thyroid',    type: 'synonym', synonyms: ['tft', 'tsh', 'thyroid', 'thyroid profile', 'thyroid function test'] },
  { objectID: 'syn_hba1c',      type: 'synonym', synonyms: ['hba1c', 'a1c', 'glycosylated haemoglobin', 'glycated haemoglobin'] },
  { objectID: 'syn_vitd',       type: 'synonym', synonyms: ['vitamin d', 'vit d', 'vit d3', '25 oh', 'cholecalciferol'] },
  { objectID: 'syn_vitb12',     type: 'synonym', synonyms: ['vitamin b12', 'vit b12', 'b12', 'cobalamin'] },
  { objectID: 'syn_lipid',      type: 'synonym', synonyms: ['lipid', 'lipid profile', 'cholesterol test', 'lipid panel'] },
  { objectID: 'syn_dengue',     type: 'synonym', synonyms: ['dengue', 'ns1', 'dengue antigen', 'dengue test'] },
  { objectID: 'syn_typhoid',    type: 'synonym', synonyms: ['typhoid', 'widal', 'salmonella'] },
  { objectID: 'syn_malaria',    type: 'synonym', synonyms: ['malaria', 'malarial', 'mp', 'malarial parasite'] },
  { objectID: 'syn_hiv',        type: 'synonym', synonyms: ['hiv', 'aids', 'retroviral'] },
  { objectID: 'syn_esr',        type: 'synonym', synonyms: ['esr', 'erythrocyte sedimentation rate'] },
  { objectID: 'syn_crp',        type: 'synonym', synonyms: ['crp', 'c reactive protein', 'c-reactive protein'] },
  { objectID: 'syn_psa',        type: 'synonym', synonyms: ['psa', 'prostate specific antigen', 'prostate test'] },
  { objectID: 'syn_uric',       type: 'synonym', synonyms: ['uric acid', 'gout test', 'urate'] },
  { objectID: 'syn_sugar',      type: 'synonym', synonyms: ['blood sugar', 'glucose', 'sugar test', 'fasting sugar'] },
  { objectID: 'syn_tb',         type: 'synonym', synonyms: ['tb', 'tuberculosis', 'mtb', 'tb pcr', 'tb gold'] },
  { objectID: 'syn_pregnancy',  type: 'synonym', synonyms: ['pregnancy test', 'beta hcg', 'hcg', 'pregnancy'] },
  { objectID: 'syn_syphilis',   type: 'synonym', synonyms: ['syphilis', 'vdrl', 'rpr', 'tpha'] },
  { objectID: 'syn_hepatitisb', type: 'synonym', synonyms: ['hepatitis b', 'hbsag', 'hbv', 'hbs ag'] },
  { objectID: 'syn_hepatitisc', type: 'synonym', synonyms: ['hepatitis c', 'hcv', 'hcv ab'] },
  { objectID: 'syn_pcr',        type: 'synonym', synonyms: ['pcr', 'rt-pcr', 'molecular test', 'dna test', 'rna test'] },
];

async function _doReindexLabs() {
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
  await replaceAllObjects('labs', records);
  return records.length;
}

async function _doReindexProducts() {
  const products = await Product.find()
    .populate('lab', 'name slug city state address area pincode')
    .populate('testMaster', 'name description sampleType reportTime fastingRequired homeCollection')
    .lean();
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
  if (hasAlgoliaConfig()) {
    const { getClient, indexName } = require('../config/algolia');
    const client = getClient();
    await client.saveSynonyms({ indexName: indexName('products'), synonyms: SYNONYM_RULES, forwardToReplicas: true });
  }
  await replaceAllObjects('products', records);
  return records.length;
}

async function _doReindexPages() {
  const Page = require('../models/Page');
  const pages = await Page.find({ isPublished: true });
  const records = pages.map(pageRecord);
  await setIndexSettings('pages', {
    searchableAttributes: ['title', 'seoTitle', 'seoDescription', 'content'],
    attributesForFaceting: ['filterOnly(isPublished)'],
  });
  await replaceAllObjects('pages', records);
  return records.length;
}

exports.reindexProducts = asyncHandler(async (req, res) => {
  const count = await _doReindexProducts();
  res.json({ message: 'Products reindexed', count });
});

exports.reindexPages = asyncHandler(async (req, res) => {
  const count = await _doReindexPages();
  res.json({ message: 'Pages reindexed', count });
});

exports.reindexAll = asyncHandler(async (req, res) => {
  const [labs, products, pages] = await Promise.all([
    _doReindexLabs(),
    _doReindexProducts(),
    _doReindexPages(),
  ]);
  res.json({ message: 'Full reindex complete', labs, products, pages });
});
