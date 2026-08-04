// Required at the top of any test file that exercises a path which would otherwise
// send a real email/SMS/WhatsApp or hit the real Razorpay API. Must be required BEFORE
// the controller under test (jest.mock calls are hoisted by babel-jest, but this keeps
// intent obvious at the call site too).
jest.mock('../../src/config/email', () => ({
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
}));

jest.mock('../../src/config/sms', () => ({
  sendSms: jest.fn().mockResolvedValue({ return: true }),
  sendOtpSms: jest.fn().mockResolvedValue({ return: true }),
  sendWhatsapp: jest.fn().mockResolvedValue({ sid: 'test-message-sid' }),
}));

// createOrder still needs a real-shaped response; verifyPayment's HMAC check is pure
// crypto and deliberately NOT mocked here — tests compute a real signature against
// this same fake secret so the actual verification logic runs for real.
const FAKE_KEY_ID = 'rzp_test_fake_key_id';
const FAKE_KEY_SECRET = 'fake_test_secret_for_hmac';

jest.mock('../../src/config/razorpay', () => ({
  getRazorpayClient: jest.fn().mockResolvedValue({
    orders: {
      create: jest.fn().mockImplementation(({ amount, currency, receipt }) =>
        Promise.resolve({ id: `order_test_${Date.now()}_${Math.random().toString(36).slice(2)}`, amount, currency, receipt })
      ),
    },
  }),
  getPublicKeyId: jest.fn().mockResolvedValue(FAKE_KEY_ID),
  loadConfig: jest.fn().mockResolvedValue({ keyId: FAKE_KEY_ID, keySecret: FAKE_KEY_SECRET }),
}));

// Call counts (e.g. "was the confirmation email sent exactly once") must never leak
// between `it()` blocks — without this, a later test can spuriously see calls made by
// an earlier one (or vice versa) since jest.mock's mock.calls persist by default.
afterEach(() => {
  jest.clearAllMocks();
});

module.exports = { FAKE_KEY_ID, FAKE_KEY_SECRET };
