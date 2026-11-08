const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const app = require('./app');

test('health endpoint reports API status without exposing secrets', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.status, 'ok');
  assert.equal(typeof response.body.database, 'string');
  assert.ok(response.headers['x-request-id']);
});

test('protected booking routes reject unauthenticated requests', async () => {
  const response = await request(app).get('/api/bookings/mine').expect(401);
  assert.equal(response.body.error.code, 'UNAUTHENTICATED');
});

test('Razorpay webhook rejects missing signatures before processing', async () => {
  const response = await request(app)
    .post('/api/payments/verify-webhook')
    .set('Content-Type', 'application/json')
    .send({ event: 'payment.captured' })
    .expect(400);
  assert.equal(response.body.error.code, 'INVALID_WEBHOOK_SIGNATURE');
});

test('unknown API paths return a structured 404 response', async () => {
  const response = await request(app).get('/api/not-a-route').expect(404);
  assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
});
