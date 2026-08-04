const base = require('@playwright/test');

// The real Google OAuth client ID (frontend/.env.local) only allow-lists the app's
// normal dev origins — localhost:3001 (this E2E run's port) isn't one of them, so
// Google's GSI script 403s and its error response was observed to cascade into a
// page-wide "Invalid or unexpected token" JS error, breaking React hydration
// entirely (submit buttons silently degrade to native form GETs). Google Sign-In
// itself isn't under test anywhere in this suite, so block it outright rather than
// let an unrelated third-party config issue destabilize every other spec.
const test = base.test.extend({
  page: async ({ page }, use) => {
    // gstatic.com serves the GSI "credential button" library the accounts.google.com
    // iframe loads — blocking only one of the two still left a JS parse error breaking
    // hydration (confirmed empirically), so both must be blocked.
    await page.route(/accounts\.google\.com|gstatic\.com/, (route) => route.abort());
    // Pre-accept the cookie banner (src/components/ui/CookieConsent.js) — it's a
    // fixed-position overlay that otherwise intercepts pointer events on real page
    // content (e.g. the "Create Account" submit button) on every fresh page load.
    await page.addInitScript(() => {
      window.localStorage.setItem('cookie_consent', 'accepted');
    });

    // Next.js dev-mode compiles each route on first request and React hydration
    // finishes slightly after the initial HTML response — clicking a submit button
    // in that window silently falls back to a native (unhandled) form submission
    // instead of the React handler. Waiting for network-idle after every goto() gives
    // hydration time to finish before any test interacts with the page.
    const originalGoto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await originalGoto(url, options);
      await page.waitForLoadState('networkidle');
      // networkidle only guarantees the JS bundle finished downloading, not that React
      // has finished hydrating/attaching event listeners — empirically still a race
      // without this extra buffer (submit buttons silently no-op or native-submit).
      await page.waitForTimeout(500);
      return response;
    };

    await use(page);
  },
});

// Even with the networkidle+buffer wait above, clicking a submit button can still
// occasionally race Next dev-mode hydration (empirically ~intermittent, not fully
// eliminated by waiting longer) — when it does, the browser falls back to a native
// form GET, landing on the same page with the field values as a query string instead
// of running the React handler. Detectable (URL gains a '?') and safely recoverable:
// reload the clean URL and redo the fill+submit, since no request has actually reached
// the backend in that failure mode.
async function submitWithRetry(page, { fill, submitButtonName, expectedUrlPattern, maxAttempts = 3 }) {
  const cleanUrl = page.url().split('?')[0];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await fill();
    await page.getByRole('button', { name: submitButtonName }).click();
    try {
      await page.waitForURL(expectedUrlPattern, { timeout: 4000 });
      return;
    } catch {
      if (attempt === maxAttempts) {
        throw new Error(`submitWithRetry: never reached ${expectedUrlPattern} after ${maxAttempts} attempts (stuck at ${page.url()})`);
      }
      await page.goto(cleanUrl);
    }
  }
}

// Same dev-server cold-start category as submitWithRetry, different symptom: the
// FIRST-ever request to a heavier route (e.g. /search, with its debounced-search
// effect + backend round trip) can take longer to compile than any fixed buffer
// comfortably covers, so the debounced search fires and genuinely completes with zero
// results — not "still loading" — before the route has actually finished warming up.
// A stuck "No results" is a stable end state no amount of extra waiting fixes, so this
// retries the navigation itself instead.
async function gotoAndWaitForSearchResults(page, url, resultLocator, { maxAttempts = 3 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.goto(url);
    try {
      await resultLocator.waitFor({ state: 'visible', timeout: 6000 });
      return;
    } catch {
      if (attempt === maxAttempts) throw new Error(`gotoAndWaitForSearchResults: no results for ${url} after ${maxAttempts} attempts`);
    }
  }
}

module.exports = { test, expect: base.expect, submitWithRetry, gotoAndWaitForSearchResults };
