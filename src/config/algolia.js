const { algoliasearch } = require('algoliasearch');

const appId = process.env.ALGOLIA_APP_ID;
const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY;
const indexPrefix = process.env.ALGOLIA_INDEX_PREFIX || 'diagnostic_';

function hasAlgoliaConfig() {
  return Boolean(appId && adminApiKey);
}

function getClient() {
  if (!hasAlgoliaConfig()) return null;
  return algoliasearch(appId, adminApiKey);
}

function indexName(name) {
  return `${indexPrefix}${name}`;
}

module.exports = {
  hasAlgoliaConfig,
  getClient,
  indexName
};
