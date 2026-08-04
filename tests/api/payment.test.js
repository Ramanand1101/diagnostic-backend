require('../mocks/external');
const { FAKE_KEY_SECRET } = require('../mocks/external');
const { sendMail } = require('../../src/config/email');
const request = require('supertest');
const { setupTestDB } = require('../helpers/db');
const {
  createUser, createLab, createProduct, createPatient, createBooking,
  authHeader, signRazorpayPayload,
} = require('../helpers/factories');
const { flushAsync } = require('../helpers/wait');
const Booking = require('../../src/models/Booking');
const Payment = require('../../src/models/Payment');
const app = require('../../src/app');

setupTestDB();

async function setupUnpaidBooking(overrides = {}) {
  const user = await createUser();
  const lab = await createLab();
  const product = await createProduct(lab);
  const patient = await createPatient(user);
  const booking = await createBooking(
    { user, lab, patient, product },
    { paymentMethod: 'online', paymentStatus: 'unpaid', ...overrides }
  );
  return { user, lab, product, patient, booking };
}

describe('Payment API (Razorpay)', () => {
  describe('POST /api/v1/payments/razorpay/order', () => {
    it('creates an order + Payment record for an eligible unpaid online booking', async () => {
      const { user, booking } = await setupUnpaidBooking();
      const res = await request(app)
        .post('/api/v1/payments/razorpay/order')
        .set(authHeader(user))
        .send({ bookingIds: [String(booking._id)] });

      expect(res.status).toBe(200);
      expect(res.body.orderId).toMatch(/^order_/);
      expect(res.body.amount).toBe(Math.round(booking.total * 100));

      const payment = await Payment.findOne({ razorpayOrderId: res.body.orderId });
      expect(payment).toBeTruthy();
      expect(payment.amount).toBe(booking.total);

      const freshBooking = await Booking.findById(booking._id);
      expect(String(freshBooking.payment)).toBe(String(payment._id));
    });

    it("rejects a booking that isn't the caller's own", async () => {
      const { booking } = await setupUnpaidBooking();
      const otherUser = await createUser({ email: 'other@example.com' });
      const res = await request(app)
        .post('/api/v1/payments/razorpay/order')
        .set(authHeader(otherUser))
        .send({ bookingIds: [String(booking._id)] });
      expect(res.status).toBe(400);
    });

    it('rejects a booking that is already paid (cannot double-charge)', async () => {
      const { user, booking } = await setupUnpaidBooking({ paymentStatus: 'paid' });
      const res = await request(app)
        .post('/api/v1/payments/razorpay/order')
        .set(authHeader(user))
        .send({ bookingIds: [String(booking._id)] });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/payments/razorpay/verify — signature is the only trust boundary', () => {
    async function createOrderFor(user, booking) {
      const res = await request(app)
        .post('/api/v1/payments/razorpay/order')
        .set(authHeader(user))
        .send({ bookingIds: [String(booking._id)] });
      return res.body.orderId;
    }

    it('flips the booking to paid and fires the confirmation when the signature is valid', async () => {
      const { user, booking } = await setupUnpaidBooking();
      const orderId = await createOrderFor(user, booking);
      const paymentId = 'pay_test_valid_123';
      const signature = signRazorpayPayload(orderId, paymentId, FAKE_KEY_SECRET);

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set(authHeader(user))
        .send({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature });

      expect(res.status).toBe(200);
      expect(res.body.bookings[0].paymentStatus).toBe('paid');

      const freshBooking = await Booking.findById(booking._id);
      expect(freshBooking.paymentStatus).toBe('paid');
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      expect(payment.status).toBe('paid');
      await flushAsync();
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('rejects a tampered/invalid signature and leaves the booking unpaid (regression: the entire point of this integration)', async () => {
      const { user, booking } = await setupUnpaidBooking();
      const orderId = await createOrderFor(user, booking);
      const paymentId = 'pay_test_tampered_456';
      const fakeSignature = 'not-a-real-signature-an-attacker-made-up';

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set(authHeader(user))
        .send({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: fakeSignature });

      expect(res.status).toBe(400);

      const freshBooking = await Booking.findById(booking._id);
      expect(freshBooking.paymentStatus).toBe('unpaid');
      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      expect(payment.status).toBe('failed');
      await flushAsync();
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('rejects a signature computed with the wrong secret (proves the check is not trivially bypassable)', async () => {
      const { user, booking } = await setupUnpaidBooking();
      const orderId = await createOrderFor(user, booking);
      const paymentId = 'pay_test_wrong_secret_789';
      const wrongSecretSignature = signRazorpayPayload(orderId, paymentId, 'totally-different-secret');

      const res = await request(app)
        .post('/api/v1/payments/razorpay/verify')
        .set(authHeader(user))
        .send({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: wrongSecretSignature });

      expect(res.status).toBe(400);
      const freshBooking = await Booking.findById(booking._id);
      expect(freshBooking.paymentStatus).toBe('unpaid');
    });
  });
});
