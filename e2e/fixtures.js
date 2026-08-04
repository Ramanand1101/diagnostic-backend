// Shared between e2e/global-setup.js (seeds these) and the spec files (log in as
// these) — one place to change credentials/fixture shape.
module.exports = {
  SUPERADMIN: { email: 'e2e-superadmin@example.com', password: 'E2ePassword123!' },
  LAB_USER: { email: 'e2e-lab@example.com', password: 'E2ePassword123!' },
  LAB_NAME: 'E2E Test Diagnostics Lab',
  LAB_SLUG: 'e2e-test-diagnostics-lab',
  PRODUCT_NAME: 'E2E CBC Test',
  PRODUCT_SLUG: 'e2e-cbc-test',
  PRODUCT_PRICE: 400,
  PRODUCT_SALE_PRICE: 340,
};
