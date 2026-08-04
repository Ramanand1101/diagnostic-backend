const { test, expect, submitWithRetry } = require('./helpers');
const { SUPERADMIN } = require('./fixtures');

async function fillRegisterForm(page, { name, email }) {
  await page.getByPlaceholder('John Doe').fill(name);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Min 8 characters').fill('Password123!');
  await page.getByPlaceholder('Re-enter password').fill('Password123!');
}

test.describe('Auth', () => {
  test('register creates an account and lands on the customer dashboard', async ({ page }) => {
    const email = `e2e-register-${Date.now()}@example.com`;
    await page.goto('/register');
    await submitWithRetry(page, {
      fill: () => fillRegisterForm(page, { name: 'E2E New User', email }),
      submitButtonName: 'Create Account',
      expectedUrlPattern: /\/dashboard/,
    });

    await expect(page.getByText(/^Welcome, E2E!/)).toBeVisible();
  });

  test('wrong password shows an error and does not log in', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com or 9876543210').fill(SUPERADMIN.email);
    await page.getByPlaceholder('••••••••').fill('DefinitelyWrongPassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout returns to a logged-out state', async ({ page }) => {
    // Customer flow (not admin — /admin has its own separate layout/header) so this
    // exercises the same Navbar logout every regular customer uses.
    const email = `e2e-logout-${Date.now()}@example.com`;
    await page.goto('/register');
    await submitWithRetry(page, {
      fill: () => fillRegisterForm(page, { name: 'E2E Logout', email }),
      submitButtonName: 'Create Account',
      expectedUrlPattern: /\/dashboard/,
    });

    await page.getByRole('button', { name: 'E2E' }).click();
    await page.getByRole('button', { name: 'Logout' }).click();
    await page.getByRole('button', { name: 'Yes, Logout' }).click();

    // Lands on either '/' (Navbar's own router.push) or '/login' (a lingering
    // authenticated request made during the transition can 401 and trigger the
    // global axios interceptor's window.location.href redirect — a pre-existing
    // race, not something this suite is responsible for fixing). Either way, the
    // meaningful assertion is simply: no longer authenticated.
    await expect(page).toHaveURL(/\/(login)?$/);
    await expect(
      page.getByRole('link', { name: 'Login' }).or(page.getByRole('button', { name: 'Sign In' }))
    ).toBeVisible();
  });
});
