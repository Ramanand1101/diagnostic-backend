const dotenv = require('dotenv');
dotenv.config();

const connectDB      = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');
const { initQueues } = require('./src/queues/index');
const app            = require('./src/app');

const PORT = process.env.PORT || 5001;

(async () => {
  await connectDB();

  // Redis + queues are optional — app still works if Redis is down
  await connectRedis();
  initQueues();

  app.listen(PORT, () => {
    console.log(`[API] running on port ${PORT} (pid ${process.pid})`);
  });
})();
