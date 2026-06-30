const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../src/config/db');
const app = require('../src/app');

// Cache connection across warm serverless invocations
let connected = false;

module.exports = async (req, res) => {
  if (!connected) {
    await connectDB();
    connected = true;
  }
  return app(req, res);
};
