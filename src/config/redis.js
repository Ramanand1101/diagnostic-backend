const { createClient } = require('redis');

let client = null;
let connected = false;

async function connectRedis() {
  if (connected && client) return client;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  client = createClient({ url });

  client.on('error', (err) => {
    connected = false;
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Redis] error:', err.message);
    }
  });
  client.on('ready', () => {
    connected = true;
  });
  client.on('end', () => {
    connected = false;
  });

  try {
    await client.connect();
    connected = true;
    console.log('[Redis] connected');
  } catch (err) {
    connected = false;
    client = null;
    console.warn('[Redis] not available — running without cache:', err.message);
  }

  return connected ? client : null;
}

function getClient() { return connected ? client : null; }
function isReady()   { return connected && client !== null; }

module.exports = { connectRedis, getClient, isReady };
