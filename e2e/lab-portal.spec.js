const { test, expect, submitWithRetry } = require('./helpers');
const { LAB_USER } = require('./fixtures');

async function loginAsLabUser(page) {
  await page.goto('/login');
  await submitWithRetry(page, {
    fill: async () => {
      await page.getByPlaceholder('you@example.com or 9876543210').fill(LAB_USER.email);
      await page.getByPlaceholder('••••••••').fill(LAB_USER.password);
    },
    submitButtonName: 'Sign In',
    expectedUrlPattern: /\/dashboard/,
  });
}

test.describe('Lab portal', () => {
  test('lab user logs in and lands on the Lab Management Dashboard', async ({ page }) => {
    await loginAsLabUser(page);
    await expect(page.getByText('Lab Management Dashboard')).toBeVisible();
  });

  test('lab bookings page is reachable and scoped to this lab', async ({ page }) => {
    await loginAsLabUser(page);
    await page.goto('/dashboard/lab/bookings');
    await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();
  });
});
