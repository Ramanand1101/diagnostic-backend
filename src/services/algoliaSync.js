const { hasAlgoliaConfig, getClient, indexName } = require('../config/algolia');

async function syncObjects(index, objects) {
  if (!hasAlgoliaConfig()) return null;
  const client = getClient();
  return client.saveObjects({ indexName: indexName(index), objects });
}

async function deleteObject(index, objectID) {
  if (!hasAlgoliaConfig()) return null;
  const client = getClient();
  return client.deleteObject({ indexName: indexName(index), objectID });
}

// Atomic full replace — removes stale records not in `objects`
async function replaceAllObjects(index, objects) {
  if (!hasAlgoliaConfig()) return null;
  const client = getClient();
  return client.replaceAllObjects({ indexName: indexName(index), objects });
}

async function setIndexSettings(index, settings) {
  if (!hasAlgoliaConfig()) return null;
  const client = getClient();
  return client.setSettings({ indexName: indexName(index), indexSettings: settings });
}

async function searchIndex(index, query, params = {}) {
  if (!hasAlgoliaConfig()) return { hits: [], nbHits: 0 };
  const client = getClient();
  return client.searchSingleIndex({
    indexName: indexName(index),
    searchParams: { query, ...params }
  });
}

module.exports = { syncObjects, deleteObject, replaceAllObjects, setIndexSettings, searchIndex };
