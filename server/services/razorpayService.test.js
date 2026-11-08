const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const { verifyWebhookSignature } = require('./razorpayService');

test('verifies Razorpay HMAC signatures over the exact raw request body', () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  const secret = 'test-webhook-secret';
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyWebhookSignature(body, signature, secret), true);
  assert.equal(verifyWebhookSignature(Buffer.from(`${body} `), signature, secret), false);
  assert.equal(verifyWebhookSignature(body, 'not-a-signature', secret), false);
  assert.equal(verifyWebhookSignature(body, signature, ''), false);
});
