const assert = require('node:assert/strict');
const test = require('node:test');
const { calculateDriverBata, calculateFare } = require('./pricingService');

test('calculates the complete fare and applies a fee waiver without a negative total', () => {
  const fare = calculateFare({
    baseFare: 500,
    distanceKm: 100,
    ratePerKm: 20,
    driverBata: 600,
    estimatedTolls: 50,
    borderTaxes: 30,
    surcharges: 40,
    waivedFees: 70,
  });
  assert.equal(fare.total, 3150);
  assert.equal(fare.distanceFare, 2000);
  assert.equal(calculateFare({ baseFare: 10, waivedFees: 100 }).total, 0);
});

test('rejects negative or non-finite fare inputs', () => {
  assert.throws(() => calculateFare({ distanceKm: -1 }), /distanceKm/);
  assert.throws(() => calculateFare({ ratePerKm: Number.NaN }), /ratePerKm/);
});

test('calculates day and India-local night bata units', () => {
  const result = calculateDriverBata({
    startAt: '2026-01-01T15:30:00Z',
    endAt: '2026-01-02T01:30:00Z',
    dayRate: 500,
    nightRate: 300,
  });
  assert.deepEqual(result, { dayUnits: 1, nightUnits: 1, total: 800 });
});
