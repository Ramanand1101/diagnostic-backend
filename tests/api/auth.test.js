require('../mocks/external');
const request = require('supertest');
const { setupTestDB } = require('../helpers/db');
const { createUser, authHeader } = require('../helpers/factories');
const app = require('../../src/app');

setupTestDB();

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('creates a customer account and returns a token', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Praveen Kumar',
        email: 'praveen@example.com',
        mobile: '9876543210',
        password: 'Password123!',
      });
      expect(res.status).toBe(201);
      expect(res.body.token).toBeTruthy();
      expect(res.body.user.role).toBe('customer');
    });

    it('never grants an elevated role even if the client sends one (regression: public self-registration must not be able to mint admin accounts)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Attacker',
        email: 'attacker@example.com',
        mobile: '9876543211',
        password: 'Password123!',
        role: 'superadmin',
      });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('customer');
    });

    it('rejects a duplicate email', async () => {
      await createUser({ email: 'dupe@example.com' });
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Someone', email: 'dupe@example.com', password: 'Password123!',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with correct credentials', async () => {
      await createUser({ email: 'login@example.com', password: 'Password123!' });
      const res = await request(app).post('/api/v1/auth/login').send({
        emailOrMobile: 'login@example.com', password: 'Password123!',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    });

    it('rejects a wrong password with a generic message (never reveals whether the account exists)', async () => {
      await createUser({ email: 'login2@example.com', password: 'Password123!' });
      const wrongPass = await request(app).post('/api/v1/auth/login').send({
        emailOrMobile: 'login2@example.com', password: 'WrongPassword',
      });
      const noSuchUser = await request(app).post('/api/v1/auth/login').send({
        emailOrMobile: 'nobody@example.com', password: 'WrongPassword',
      });
      expect(wrongPass.status).toBe(401);
      expect(noSuchUser.status).toBe(401);
      expect(wrongPass.body.message).toBe(noSuchUser.body.message);
    });
  });

  describe('POST /api/v1/auth/auto-register (guest checkout)', () => {
    it('creates a customer account without a password from the client', async () => {
      const res = await request(app).post('/api/v1/auth/auto-register').send({
        name: 'Guest User', email: 'guest@example.com', mobile: '9876543212',
      });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('customer');
    });

    it('rejects a second auto-register for an existing email', async () => {
      await createUser({ email: 'guest2@example.com' });
      const res = await request(app).post('/api/v1/auth/auto-register').send({
        name: 'Guest Again', email: 'guest2@example.com',
      });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns the user for a valid token', async () => {
      const user = await createUser();
      const res = await request(app).get('/api/v1/auth/me').set(authHeader(user));
      expect(res.status).toBe(200);
    });

    it('rejects a missing token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('rejects a malformed/invalid token', async () => {
      const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-real-token');
      expect(res.status).toBe(401);
    });
  });
});
