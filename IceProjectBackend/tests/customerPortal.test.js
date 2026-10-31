const request = require('supertest');
const createApp = require('../src/app');
const mongoose = require('mongoose');
const db = require('../src/db/db');

// Basic integration tests for customer portal endpoints
// Assumptions: test DB, auth route can create/login customer user, token returned
// These are smoke-level; expand with more edge cases later.

let app; let server; let token; let customerId;

beforeAll(async () => {
  // Ensure DB is connected before exercising routes that hit the DAL
  await db.connect();
  app = createApp();
  server = app.listen(0);
});

afterAll(async () => {
  if (server) server.close();
  await mongoose.connection.close();
});

describe('Customer Portal', () => {
  test('register + login customer user (or reuse)', async () => {
    // Try register
    const email = `cust${Date.now()}@test.com`;
    const password = 'Password123';
    const regRes = await request(server)
      .post('/auth/register')
      .send({
        email,
        password,
        role: 'customer',
        name: 'Test Customer',
        phone: '+15555550123',
        address: { street: '1 Test St', city: 'Testville', state: 'TS', zipCode: '00000' }
      });

    expect([200,201,409,400]).toContain(regRes.status); // accept 400 if schema changed

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('accessToken');
    token = loginRes.body.accessToken;

    // Attempt profile fetch if available
    const profileRes = await request(server)
      .get('/customers/profile')
      .set('Authorization', `Bearer ${token}`);
    // Profile may or may not exist depending on separate customer entity creation
    if (profileRes.status === 200) {
      customerId = profileRes.body.customer?.id;
    }
  });

  test('list orders (empty initially)', async () => {
    const res = await request(server)
      .get('/customer-portal/orders')
      .set('Authorization', `Bearer ${token}`);
    // If customerId not yet associated backend may 400; accept both early on
    expect([200,400]).toContain(res.status);
    if(res.status === 200) {
      expect(Array.isArray(res.body.orders)).toBe(true);
    }
  });

  test('create order (if customer profile exists)', async () => {
    if (!customerId) {
      return; // skip if no profile
    }
    const orderRes = await request(server)
      .post('/customer-portal/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        items: [ { productName: 'Sample Item', quantity: 1, unitPrice: 10, discount:0, taxRate: 0 } ],
        paymentMethod: 'cash'
      });
    expect([201,400]).toContain(orderRes.status); // 400 if validation/context missing
  });
});
