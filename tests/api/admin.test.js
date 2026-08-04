require('../mocks/external');
const request = require('supertest');
const { setupTestDB } = require('../helpers/db');
const { createUser, createLab, createProduct, createPatient, createBooking, authHeader } = require('../helpers/factories');
const app = require('../../src/app');

setupTestDB();

describe('Admin — Integration Settings (superadmin only)', () => {
  it('rejects a plain customer', async () => {
    const customer = await createUser();
    const res = await request(app).get('/api/v1/integrations').set(authHeader(customer));
    expect(res.status).toBe(403);
  });

  it('rejects a lab-role user', async () => {
    const labUser = await createUser({ role: 'lab', email: 'labadmin@example.com' });
    const res = await request(app).get('/api/v1/integrations').set(authHeader(labUser));
    expect(res.status).toBe(403);
  });

  it('rejects a subadmin with no explicit permission', async () => {
    const subadmin = await createUser({ role: 'subadmin', email: 'subadmin@example.com' });
    const res = await request(app).get('/api/v1/integrations').set(authHeader(subadmin));
    expect(res.status).toBe(403);
  });

  it('lets a superadmin list, save, and remove the Razorpay integration', async () => {
    const superadmin = await createUser({ role: 'superadmin', email: 'super@example.com' });

    const list = await request(app).get('/api/v1/integrations').set(authHeader(superadmin));
    expect(list.status).toBe(200);
    const paymentEntry = list.body.items.find((i) => i.key === 'payment');
    expect(paymentEntry).toBeTruthy();
    expect(paymentEntry.configured).toBe(false);

    const save = await request(app)
      .put('/api/v1/integrations/payment')
      .set(authHeader(superadmin))
      .send({ config: { keyId: 'rzp_test_abc123', keySecret: 'super-secret-value' }, enabled: true });
    expect(save.status).toBe(200);
    expect(save.body.configured).toBe(true);
    expect(save.body.enabled).toBe(true);
    // Sensitive fields must never come back in plaintext.
    expect(save.body.config.keySecret).not.toBe('super-secret-value');

    const del = await request(app).delete('/api/v1/integrations/payment').set(authHeader(superadmin));
    expect(del.status).toBe(200);

    const listAfter = await request(app).get('/api/v1/integrations').set(authHeader(superadmin));
    const paymentAfter = listAfter.body.items.find((i) => i.key === 'payment');
    expect(paymentAfter.configured).toBe(false);
  });
});

describe('Admin — Billing summary math', () => {
  it('sums adminProfit/labPayable correctly for paid bookings, excludes cancelled ones', async () => {
    const user = await createUser();
    const lab = await createLab();
    // salePrice 340, labPrice 200 → adminProfit 140 per booking
    const product = await createProduct(lab);
    const patient = await createPatient(user);

    await createBooking({ user, lab, patient, product }, {
      paymentStatus: 'paid', status: 'confirmed',
      total: 340, labPayable: 200, adminProfit: 140,
    });
    await createBooking({ user, lab, patient, product }, {
      paymentStatus: 'paid', status: 'cancelled', // must be excluded from revenue figures
      total: 340, labPayable: 200, adminProfit: 140,
    });

    const superadmin = await createUser({ role: 'superadmin', email: 'billingadmin@example.com' });
    const res = await request(app)
      .get('/api/v1/bookings/stats')
      .query({ lab: String(lab._id) })
      .set(authHeader(superadmin));

    expect(res.status).toBe(200);
    expect(res.body.totalCount).toBe(1); // cancelled one excluded
    expect(res.body.totalAdminProfit).toBe(140);
    expect(res.body.totalLabPayable).toBe(200);
  });
});
