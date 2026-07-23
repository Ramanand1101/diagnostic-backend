const { Queue } = require('bullmq');
const { isReady, getClient } = require('../config/redis');

let emailQueue   = null;
let algoliaQueue = null;

function getConnection() {
  const r = getClient();
  if (!r) return null;
  // BullMQ needs ioredis-style connection; pass raw redis URL instead
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

function initQueues() {
  if (!isReady()) {
    console.warn('[Queue] Redis not available — jobs will run inline (synchronous fallback)');
    return;
  }
  const conn = getConnection();
  emailQueue   = new Queue('email',   { connection: conn, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } } });
  algoliaQueue = new Queue('algolia', { connection: conn, defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 1000 } } });
  console.log('[Queue] email + algolia queues ready');
}

// Add email job — falls back to fire-and-forget direct call if no Redis
async function queueEmail(payload) {
  if (emailQueue) {
    return emailQueue.add('send', payload);
  }
  // Fallback: run async without blocking caller
  const { sendMail } = require('../config/email');
  sendMail(payload).catch((e) => console.error('[Email] failed:', e.message));
}

// Add algolia sync job — falls back to fire-and-forget direct call
async function queueAlgoliaSync(index, objects) {
  if (algoliaQueue) {
    return algoliaQueue.add('sync', { type: 'save', index, objects });
  }
  const { syncObjects } = require('../services/algoliaSync');
  syncObjects(index, objects).catch((e) => console.error('[Algolia] sync failed:', e.message));
}

async function queueAlgoliaDelete(index, objectIDs) {
  if (algoliaQueue) {
    return algoliaQueue.add('delete', { type: 'delete', index, objectIDs });
  }
  const { deleteObjects } = require('../services/algoliaSync');
  deleteObjects(index, objectIDs).catch((e) => console.error('[Algolia] delete failed:', e.message));
}

module.exports = { initQueues, queueEmail, queueAlgoliaSync, queueAlgoliaDelete };
