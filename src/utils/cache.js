const { getClient } = require('../config/redis');

async function cacheGet(key) {
  try {
    const r = getClient();
    if (!r) return null;
    const raw = await r.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  try {
    const r = getClient();
    if (!r) return;
    await r.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {}
}

async function cacheDel(...keys) {
  try {
    const r = getClient();
    if (!r) return;
    await r.del(keys);
  } catch {}
}

// Invalidate all keys matching a pattern (e.g. 'products:*')
async function cacheDelPattern(pattern) {
  try {
    const r = getClient();
    if (!r) return;
    const keys = await r.keys(pattern);
    if (keys.length) await r.del(keys);
  } catch {}
}

// Wrap an async function with cache-aside pattern
async function cached(key, ttlSeconds, fn) {
  const hit = await cacheGet(key);
  if (hit !== null) return hit;
  const result = await fn();
  await cacheSet(key, result, ttlSeconds);
  return result;
}

module.exports = { cacheGet, cacheSet, cacheDel, cacheDelPattern, cached };
