// bookingConfirmation's send is deliberately fire-and-forget (not awaited by the
// controller — see src/utils/bookingConfirmation.js) so the HTTP response doesn't wait
// on email/SMS delivery. Tests asserting it happened need to give that background
// promise chain (DB re-fetch + queueEmail) a moment to actually run.
function flushAsync(ms = 30) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { flushAsync };
