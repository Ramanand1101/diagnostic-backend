const Lab = require('../models/Lab');

// Shared with labController.js's /labs/nearby — keep both in sync.
const RADIUS_OPTIONS_KM = [5, 10, 25, 50];
const DEFAULT_RADIUS_KM = 10;

async function inactiveBrandIds() {
  const Brand = require('../models/Brand');
  const inactive = await Brand.find({ isActive: false }).select('_id').lean();
  return inactive.map((b) => b._id);
}

// Resolves which approved labs serve a given location — either a lat/lng + radius
// ("near me") or a plain city name fallback. Excludes labs under a deactivated
// brand. Returns:
//   - null       → no location constraint was given at all (caller should not filter)
//   - Array (possibly empty) of Lab ObjectIds serving that location. An empty array
//     is a real, meaningful result: "a location was given, but zero labs serve it" —
//     callers use this to show the "no diagnostic centers available" state.
async function resolveLabIdsForLocation({ city, lat, lng, radiusKm } = {}) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  const hasCoords = lat !== undefined && lng !== undefined && !Number.isNaN(latNum) && !Number.isNaN(lngNum);
  const excludedBrandIds = await inactiveBrandIds();
  const brandOk = excludedBrandIds.length ? { $or: [{ brand: { $nin: excludedBrandIds } }, { brand: null }] } : {};

  if (hasCoords) {
    const radius = RADIUS_OPTIONS_KM.includes(Number(radiusKm)) ? Number(radiusKm) : DEFAULT_RADIUS_KM;
    const labs = await Lab.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNum, latNum] },
          distanceField: 'distanceMeters',
          maxDistance: radius * 1000,
          spherical: true,
          query: { approved: true, ...brandOk },
        },
      },
      { $project: { _id: 1 } },
    ]);
    return labs.map((l) => l._id);
  }

  if (city) {
    const labs = await Lab.find({ city: new RegExp(city, 'i'), approved: true, ...brandOk }).select('_id').lean();
    return labs.map((l) => l._id);
  }

  return null;
}

module.exports = { resolveLabIdsForLocation, RADIUS_OPTIONS_KM, DEFAULT_RADIUS_KM };
