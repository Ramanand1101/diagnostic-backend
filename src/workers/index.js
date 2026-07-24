// Worker process — run separately: node src/workers/index.js
// PM2 starts this alongside the API server (see ecosystem.config.js)
require('dotenv').config();
const { Worker } = require('bullmq');
const cron = require('node-cron');
const { connectRedis }  = require('../config/redis');
const { sendMail }      = require('../config/email');
const { syncObjects, deleteObjects } = require('../services/algoliaSync');
const connectDB         = require('../config/db');
const { checkAgreementReminders } = require('../jobs/agreementReminders');

const conn = {
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
};

async function start() {
  await connectDB();
  await connectRedis();

  // ── Email Worker ────────────────────────────────────────────────────────────
  const emailWorker = new Worker('email', async (job) => {
    const { to, subject, html, text } = job.data;
    await sendMail({ to, subject, html, text });
    console.log(`[EmailWorker] sent to ${to} (job ${job.id})`);
  }, { connection: conn, concurrency: 5 });

  emailWorker.on('failed', (job, err) => {
    console.error(`[EmailWorker] job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });

  // ── Algolia Worker ──────────────────────────────────────────────────────────
  const algoliaWorker = new Worker('algolia', async (job) => {
    if (job.name === 'sync' || job.name === 'save') {
      const { index, objects } = job.data;
      await syncObjects(index, objects);
      console.log(`[AlgoliaWorker] synced ${objects?.length} objects to ${index}`);
    } else if (job.name === 'delete') {
      const { index, objectIDs } = job.data;
      await deleteObjects(index, objectIDs);
      console.log(`[AlgoliaWorker] deleted ${objectIDs?.length} from ${index}`);
    }
  }, { connection: conn, concurrency: 3 });

  algoliaWorker.on('failed', (job, err) => {
    console.error(`[AlgoliaWorker] job ${job?.id} failed:`, err.message);
  });

  // ── Daily cron: corporate agreement expiry reminders (60/30 days out) ───────
  // Runs at 9 AM server time — matches the "server timezone is authoritative" convention
  // used elsewhere (e.g. booking late-night/short-notice warnings).
  cron.schedule('0 9 * * *', () => {
    checkAgreementReminders().catch((err) => console.error('[AgreementReminder] run failed:', err.message));
  });

  console.log('[Workers] email + algolia workers started, agreement-reminder cron scheduled (09:00 daily)');

  process.on('SIGTERM', async () => {
    await emailWorker.close();
    await algoliaWorker.close();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('[Workers] startup error:', err);
  process.exit(1);
});
