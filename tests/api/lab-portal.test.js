require('../mocks/external');
const request = require('supertest');
const { setupTestDB } = require('../helpers/db');
const { createUser, createLab, createProduct, createPatient, createBooking, authHeader } = require('../helpers/factories');
const app = require('../../src/app');

setupTestDB();

describe('Lab portal — tenant isolation', () => {
  it('a lab user only sees bookings for their own lab, never another lab\'s', async () => {
    const customer = await createUser();
    const myLab = await createLab({ name: 'My Lab' });
    const otherLab = await createLab({ name: 'Someone Else\'s Lab' });
    const myLabUser = await createUser({ role: 'lab', email: 'mylab@example.com' });
    myLab.owners = [myLabUser._id];
    await myLab.save();

    const myProduct = await createProduct(myLab);
    const otherProduct = await createProduct(otherLab);
    const patient = await createPatient(customer);

    await createBooking({ user: customer, lab: myLab, patient, product: myProduct });
    await createBooking({ user: customer, lab: otherLab, patient, product: otherProduct });

    const res = await request(app).get('/api/v1/bookings').set(authHeader(myLabUser));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(String(res.body.items[0].lab._id)).toBe(String(myLab._id));
  });

  it('a lab user with no lab of their own sees zero bookings (never falls back to "all")', async () => {
    const customer = await createUser();
    const lab = await createLab();
    const product = await createProduct(lab);
    const patient = await createPatient(customer);
    await createBooking({ user: customer, lab, patient, product });

    const unaffiliatedLabUser = await createUser({ role: 'lab', email: 'nolab@example.com' });
    const res = await request(app).get('/api/v1/bookings').set(authHeader(unaffiliatedLabUser));
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(0);
  });

  it('a lab user cannot edit another lab\'s product', async () => {
    const myLab = await createLab({ name: 'My Lab 2' });
    const otherLab = await createLab({ name: 'Other Lab 2' });
    const myLabUser = await createUser({ role: 'lab', email: 'mylab2@example.com' });
    myLab.owners = [myLabUser._id];
    await myLab.save();

    const otherProduct = await createProduct(otherLab);
    const res = await request(app)
      .put(`/api/v1/products/${otherProduct._id}`)
      .set(authHeader(myLabUser))
      .send({ price: 999 });

    expect(res.status).toBe(403);
  });
});
