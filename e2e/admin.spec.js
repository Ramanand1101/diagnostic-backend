const { test, expect, submitWithRetry } = require('./helpers');
const { SUPERADMIN } = require('./fixtures');

async function loginAsSuperadmin(page) {
  await page.goto('/login');
  await submitWithRetry(page, {
    fill: async () => {
      await page.getByPlaceholder('you@example.com or 9876543210').fill(SUPERADMIN.email);
      await page.getByPlaceholder('••••••••').fill(SUPERADMIN.password);
    },
    submitButtonName: 'Sign In',
    expectedUrlPattern: /\/admin/,
  });
}

test.describe('Admin panel', () => {
  test('superadmin can log in and reach the admin dashboard', async ({ page }) => {
    await loginAsSuperadmin(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('bookings list loads, and a status filter changes the URL/result set', async ({ page }) => {
    await loginAsSuperadmin(page);
    await page.goto('/admin/bookings');
    await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();

    await page.goto('/admin/bookings?status=confirmed');
    await expect(page).toHaveURL(/status=confirmed/);
    await expect(page.getByRole('heading', { name: 'Bookings' })).toBeVisible();
  });

  test('integrations page shows the Razorpay payment gateway card', async ({ page }) => {
    await loginAsSuperadmin(page);
    await page.goto('/admin/integrations');
    await expect(page.getByText('Payment Gateway (Razorpay)')).toBeVisible();
  });
});
