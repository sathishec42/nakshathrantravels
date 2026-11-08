const assert = require('node:assert/strict');
const test = require('node:test');
const { checkTurnaround } = require('./turnaroundService');

const startAt = new Date('2026-05-01T12:00:00.000Z');
const endAt = new Date('2026-05-01T16:00:00.000Z');

test('permits a vehicle and driver after the full 12-hour turnaround', () => {
  const result = checkTurnaround({
    startAt,
    endAt,
    existingTrips: [{ id: 'previous', startAt: '2026-05-01T00:00:00Z', endAt: '2026-05-01T00:00:00Z' }],
  });
  assert.equal(result.available, true);
  assert.deepEqual(result.conflicts, []);
});

test('rejects a previous trip with less than 12 hours of rest', () => {
  const result = checkTurnaround({
    startAt,
    endAt,
    existingTrips: [{ id: 'previous', startAt: '2026-05-01T00:00:00Z', endAt: '2026-05-01T00:01:00Z' }],
  });
  assert.equal(result.available, false);
  assert.equal(result.conflicts[0].relation, 'PREVIOUS_TRIP');
  assert.equal(result.conflicts[0].gapHours, 11.98);
});

test('rejects next-trip conflicts and overlapping assignments with diagnostics', () => {
  const nextTrip = checkTurnaround({
    startAt,
    endAt,
    existingTrips: [{ id: 'next', startAt: '2026-05-02T03:00:00Z', endAt: '2026-05-02T07:00:00Z' }],
  });

  test('uses actual drop-off time for the post-trip 12-hour buffer', () => {
    const result = checkTurnaround({
      startAt: '2026-01-03T08:00:00Z',
      endAt: '2026-01-03T12:00:00Z',
      existingTrips: [{
        id: 'late-completion',
        startAt: '2026-01-02T08:00:00Z',
        endAt: '2026-01-02T16:00:00Z',
        actualEndAt: '2026-01-02T22:00:00Z',
      }],
    });
    assert.equal(result.available, false);
    assert.equal(result.conflicts[0].relation, 'PREVIOUS_TRIP');
    assert.equal(result.conflicts[0].gapHours, 10);
  });
  assert.equal(nextTrip.conflicts[0].relation, 'NEXT_TRIP');
  assert.equal(nextTrip.conflicts[0].gapHours, 11);

  const overlap = checkTurnaround({
    startAt,
    endAt,
    existingTrips: [{ id: 'overlap', startAt: '2026-05-01T15:00:00Z', endAt: '2026-05-01T18:00:00Z' }],
  });
  assert.equal(overlap.conflicts[0].relation, 'OVERLAPPING_TRIP');
  assert.equal(overlap.conflicts[0].gapHours, -1);
});

test('requires a valid time range', () => {
  assert.throws(() => checkTurnaround({ startAt, endAt: startAt }), /end time after the start/);
});
