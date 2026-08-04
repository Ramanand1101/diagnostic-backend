const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

// Loaded explicitly (not relied on via a spawned process's own dotenv call) so we
// control exactly what env the backend webServer gets — see e2e/global-setup.js and
// tests plan for why this must never be the real MONGO_URI.
require('dotenv').config({ path: path.join(__dirname, '.env.e2e.local') });

const BACKEND_PORT = process.env.PORT || 5002;
const FRONTEND_PORT = 3001;

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  // Serial on purpose — parallel workers compete for CPU with the dev-mode
  // frontend/backend AND real third-party scripts (Razorpay's checkout), which was
  // observed to slow those down enough to fail on-time assertions. This is a small
  // suite (~9 tests); trading a bit of wall-clock time for reliability is worth it.
  workers: 1,
  retries: 0,
  reporter: 'list',
  globalSetup: require.resolve('./e2e/global-setup.js'),
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'node server.js',
      cwd: __dirname,
      port: Number(BACKEND_PORT),
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: { ...process.env, PORT: String(BACKEND_PORT) },
    },
    {
      command: `npx next dev -p ${FRONTEND_PORT}`,
      cwd: path.join(__dirname, 'frontend'),
      port: FRONTEND_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: { ...process.env, NEXT_PUBLIC_API_URL: `http://localhost:${BACKEND_PORT}/api/v1` },
    },
  ],
});
