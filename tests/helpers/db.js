const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Every test file that touches the DB calls this once at the top — spins up an
// isolated in-memory MongoDB per file (never the real MONGO_URI cluster), and wipes
// all collections between tests so fixtures never leak across `it()` blocks.
function setupTestDB() {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }, 60000);

  afterEach(async () => {
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });
}

module.exports = { setupTestDB };
