require('../mocks/external');
const { sendMail } = require('../../src/config/email');
const request = require('supertest');
const { setupTestDB } = require('../helpers/db');
const { createUser, createLab, createProduct, createPatient, createBooking, authHeader } = require('../helpers/factories');
const { flushAsync } = require('../helpers/wait');
const Booking = require('../../src/models/Booking');
const app = require('../../src/app');

setupTestDB();

async function setupBookingFixtures() {
  const user = await createUser();
  const lab = await createLab();
  const product = await createProduct(lab);
  const patient = await createPatient(user);
  return { user, lab, product, patient };
}

const tomorrow = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

describe('Booking API', () => {
  describe('POST /api/v1/bookings — payment status trust boundary', () => {
    it('forces paymentStatus to unpaid for online bookings, even if the client sends paid (regression: the old fake-checkout exploit)', async () => {
      const { user, lab, product, patient } = await setupBookingFixtures();
      const res = await request(app).post('/api/v1/bookings').set(authHeader(user)).send({
        lab: lab._id,
        items: [{ product: product._id, name: product.name, qty: 1, price: product.salePrice }],
        patient: patient._id,
        slotDate: tomorrow(),
        slotTime: '10:00 AM – 11:00 AM',
        visitType: 'lab',
        subtotal: product.salePrice,
        total: product.salePrice,
        paymentMethod: 'online',
        paymentStatus: 'paid', // client lies — server must ignore this
      });
      expect(res.status).toBe(201);
      expect(res.body.paymentStatus).toBe('unpaid');
      await flushAsync();
      // No confirmation should fire for a still-unpaid booking.
      expect(sendMail).not.toHaveBeenCalled();
    });

    it('honors an explicit paid status for cash bookings and fires the confirmation email', async () => {
      const { user, lab, product, patient } = await setupBookingFixtures();
      const res = await request(app).post('/api/v1/bookings').set(authHeader(user)).send({
        lab: lab._id,
        items: [{ product: product._id, name: product.name, qty: 1, price: product.salePrice }],
        patient: patient._id,
        slotDate: tomorrow(),
        slotTime: '10:00 AM – 11:00 AM',
        visitType: 'lab',
        subtotal: product.salePrice,
        total: product.salePrice,
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      });
      expect(res.status).toBe(201);
      expect(res.body.paymentStatus).toBe('paid');
      await flushAsync();
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('rejects admin/lab accounts from placing a booking', async () => {
      const { lab, product, patient } = await setupBookingFixtures();
      const labUser = await createUser({ role: 'lab', email: 'labowner@example.com' });
      const res = await request(app).post('/api/v1/bookings').set(authHeader(labUser)).send({
        lab: lab._id,
        items: [{ product: product._id, name: product.name, qty: 1, price: product.salePrice }],
        patient: patient._id,
        slotDate: tomorrow(),
        slotTime: '10:00 AM – 11:00 AM',
      });
      expect(res.status).toBe(403);
    });

    it('rejects a booking with no slot date/time', async () => {
      const { user, lab, product, patient } = await setupBookingFixtures();
      const res = await request(app).post('/api/v1/bookings').set(authHeader(user)).send({
        lab: lab._id,
        items: [{ product: product._id, name: product.name, qty: 1, price: product.salePrice }],
        patient: patient._id,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/bookings/stats — lab ObjectId cast', () => {
    it('correctly filters aggregated stats by lab (regression: aggregate() does not auto-cast query-string ids like find() does)', async () => {
      const { user, lab, product, patient } = await setupBookingFixtures();
      const otherLab = await createLab({ name: 'Other Lab' });
      await createBooking({ user, lab, patient, product });
      await createBooking({ user, lab: otherLab, patient, product });

      const admin = await createUser({ role: 'superadmin', email: 'admin@example.com' });
      const res = await request(app)
        .get('/api/v1/bookings/stats')
        .query({ lab: String(lab._id) })
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body.totalCount).toBe(1);
      expect(res.body.totalRevenue).toBe(product.salePrice);
    });
  });

  describe('PATCH /api/v1/bookings/:id/status — system-driven statuses', () => {
    it('rejects manually setting a system-driven status like "completed"', async () => {
      const { user, lab, product, patient } = await setupBookingFixtures();
      const booking = await createBooking({ user, lab, patient, product });
      const labOwner = await createUser({ role: 'lab', email: 'labstatus@example.com' });
      lab.owners = [labOwner._id];
      await lab.save();

      const res = await request(app)
        .patch(`/api/v1/bookings/${booking._id}/status`)
        .set(authHeader(labOwner))
        .send({ status: 'completed' });

      expect(res.status).toBe(400);
      const fresh = await Booking.findById(booking._id);
      expect(fresh.status).not.toBe('completed');
    });

    it('allows a manual, non-system status transition', async () => {
      const { user, lab, product, patient } = await setupBookingFixtures();
      const booking = await createBooking({ user, lab, patient, product });
      const labOwner = await createUser({ role: 'lab', email: 'labstatus2@example.com' });
      lab.owners = [labOwner._id];
      await lab.save();

      const res = await request(app)
        .patch(`/api/v1/bookings/${booking._id}/status`)
        .set(authHeader(labOwner))
        .send({ status: 'assigned' });

      expect(res.status).toBe(200);
      const fresh = await Booking.findById(booking._id);
      expect(fresh.status).toBe('assigned');
    });
  });
});
