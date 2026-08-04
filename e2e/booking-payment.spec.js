const { test, expect, gotoAndWaitForSearchResults } = require('./helpers');
const { PRODUCT_NAME, PRODUCT_SALE_PRICE } = require('./fixtures');

const BACKEND_URL = 'http://localhost:5002/api/v1';

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return { day: String(d.getDate()).padStart(2, '0'), month: d.toLocaleString('en-US', { month: 'long' }), year: String(d.getFullYear()) };
}

test.describe('Cart → Booking → Payment', () => {
  test('guest checkout creates exactly one unpaid booking and opens Razorpay checkout with the correct amount', async ({ page }) => {
    // Deep-dismiss/retry interaction with Razorpay's own internal checkout UI was tried
    // and dropped — its close control has no accessible name/role and lives inside a
    // third-party iframe with an undocumented, versioned internal DOM (button classes
    // observed like "hover:border-danger-700..." with no stable selector). A test
    // built on that would break on Razorpay's own UI changes, unrelated to this app's
    // code. Per the plan, this test's job is proving OUR integration is wired
    // correctly (order created for the right amount, booking created exactly once) —
    // the signature-verify/tamper-reject logic that actually matters for security is
    // already deterministically covered in tests/api/payment.test.js.
    const email = `e2e-checkout-${Date.now()}@example.com`;

    // ── Search + add to cart ──
    const addButton = page.getByRole('button', { name: 'Add' }).first();
    await gotoAndWaitForSearchResults(page, `/search?q=${encodeURIComponent(PRODUCT_NAME)}`, addButton);
    await addButton.click();

    // ── Go to cart, fill guest patient/slot details ──
    await page.goto('/cart');
    await page.getByPlaceholder('Full name').fill('E2E Test Patient');
    await page.getByPlaceholder('Age (1–100)').fill('30');
    await page.getByPlaceholder('98765 43210').fill('9876500000');
    await page.getByPlaceholder('you@example.com').fill(email);

    // Pick tomorrow's date — avoids any "slot already passed today" flakiness.
    const { day, month, year } = tomorrow();
    await page.locator('select').filter({ hasText: 'YYYY' }).selectOption(year);
    await page.locator('select').filter({ hasText: 'MM' }).selectOption({ label: month });
    await page.locator('select').filter({ hasText: 'DD' }).selectOption(day);

    // Any slot works now that the date is in the future (isSlotPast only applies to today).
    await page.getByRole('button', { name: /AM|PM/ }).first().click();

    await page.getByRole('button', { name: /Proceed to Payment/ }).click();

    // ── Razorpay Checkout opens with the right amount ──
    // Checked via rendered text content rather than element visibility — Razorpay's
    // own UI keeps a duplicate of the amount in a CSS-hidden node until a payment
    // method tab is selected, which toBeVisible() would (correctly) never see.
    const rzpFrame = page.frameLocator('iframe[src*="razorpay"]').first();
    await expect(page.locator('iframe[src*="razorpay"]').first()).toBeVisible({ timeout: 20000 });
    await expect(rzpFrame.locator('body')).toContainText(`₹${PRODUCT_SALE_PRICE}`, { timeout: 15000 });

    // ── Exactly one booking was created (not one per render/retry of the payment step) ──
    const cookies = await page.context().cookies();
    const token = cookies.find((c) => c.name === 'token')?.value;
    expect(token).toBeTruthy();
    const res = await page.request.get(`${BACKEND_URL}/bookings`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.items.length).toBe(1);
    expect(body.items[0].paymentStatus).toBe('unpaid'); // only a verified Razorpay signature can flip this
    expect(body.items[0].total).toBe(PRODUCT_SALE_PRICE);
  });
});
