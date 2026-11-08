const assert = require('node:assert/strict');
const test = require('node:test');
const { evaluatePermits } = require('./permitService');

const tripDate = new Date('2026-01-10T00:00:00Z');
const tripEnd = new Date('2026-01-12T00:00:00Z');

test('a valid AITP covering the full trip satisfies every traversed state', () => {
  const result = evaluatePermits({
    traversedStates: ['IN-KA', 'IN-TN', 'IN-KL'],
    permits: [{
      jurisdiction: 'AITP',
      status: 'VALID',
      validFrom: '2025-01-01',
      validTo: '2026-12-31',
    }],
    tripDate,
    tripEnd,
  });
  assert.equal(result.compliant, true);
  assert.deepEqual(result.flags, []);
  assert.equal(result.estimatedBorderTax, 0);
});

test('requires state coverage and returns configured border-tax estimates', () => {
  const result = evaluatePermits({
    traversedStates: ['IN-KA', 'IN-TN'],
    permits: [{
      jurisdiction: 'IN-KA',
      status: 'VALID',
      validFrom: '2025-01-01',
      validTo: '2026-12-31',
    }],
    tripDate,
    tripEnd,
    taxEstimates: { 'IN-TN': 1250 },
  });
  assert.equal(result.compliant, false);
  assert.deepEqual(result.flags, ['BORDER_PERMIT_REQUIRED', 'PERMIT_TAX_REQUIRED']);
  assert.deepEqual(result.missingStates, ['IN-TN']);
  assert.equal(result.estimatedBorderTax, 1250);
  assert.equal(result.estimateComplete, true);
});

test('flags permits expiring near the trip and does not invent an unconfigured tax amount', () => {
  const result = evaluatePermits({
    traversedStates: ['IN-KA'],
    permits: [{
      jurisdiction: 'IN-KA',
      status: 'VALID',
      validFrom: '2026-01-01',
      validTo: '2026-01-20',
    }],
    tripDate,
    tripEnd,
  });
  assert.equal(result.compliant, true);
  assert.deepEqual(result.flags, ['BORDER_PERMIT_REQUIRED', 'PERMIT_TAX_REQUIRED']);
  assert.deepEqual(result.nearExpiryStates, ['IN-KA']);
  assert.equal(result.estimatedBorderTax, null);
  assert.equal(result.estimateComplete, false);
});

test('active state-specific permits can authorize multiple states through trip completion', () => {
  const result = evaluatePermits({
    traversedStates: ['IN-KA', 'IN-TN'],
    permits: [{
      permitType: 'STATE_SPECIFIC',
      status: 'ACTIVE',
      authorizedStates: ['IN-KA', 'IN-TN'],
      validFrom: '2025-01-01',
      validTo: '2026-03-01',
    }],
    tripDate,
    tripEnd,
  });
  assert.equal(result.compliant, true);
  assert.deepEqual(result.flags, []);
});

test('rejects malformed or unordered trip dates and invalid jurisdiction codes', () => {
  assert.throws(() => evaluatePermits({ traversedStates: [], tripDate: 'invalid' }), /valid, ordered dates/);
  assert.throws(() => evaluatePermits({ traversedStates: ['KA'] }), /Invalid jurisdiction code/);
});
