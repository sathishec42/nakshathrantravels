const assert = require('node:assert/strict');
const test = require('node:test');
const {
  decodePolyline,
  detectGhatRoute,
  getConsecutiveMatrixElements,
  sampleRoute,
} = require('./distanceMatrixService');

test('decodes Google encoded polylines', () => {
  assert.deepEqual(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@'), [
    { lat: 38.5, lng: -120.2 },
    { lat: 40.7, lng: -120.95 },
    { lat: 43.252, lng: -126.453 },
  ]);
});

test('samples route endpoints for jurisdiction lookups', () => {
  const route = [{ lat: 12.9, lng: 77.5 }, { lat: 13.1, lng: 77.7 }, { lat: 13.3, lng: 77.9 }];
  const samples = sampleRoute(route, 100_000);
  assert.equal(samples[0], route[0]);
  assert.equal(samples[samples.length - 1], route[route.length - 1]);
});

test('samples long route segments at each configured interval', () => {
  const samples = sampleRoute([{ lat: 0, lng: 0 }, { lat: 0, lng: 3 }], 100_000);
  assert.ok(samples.length >= 5);
  assert.equal(samples[0].lng, 0);
  assert.equal(samples[samples.length - 1].lng, 3);
});

test('flags significant route elevation gain for ghat-road review', () => {
  assert.equal(detectGhatRoute([{ elevation: 120 }, { elevation: 450 }]), true);
  assert.equal(detectGhatRoute([{ elevation: 100 }, { elevation: 180 }, { elevation: 260 }]), false);
});

test('extracts consecutive stop legs from a Google distance matrix', () => {
  const rows = [
    { elements: [{ id: 'A-B' }, { id: 'A-C' }] },
    { elements: [{ id: 'B-B' }, { id: 'B-C' }] },
  ];
  assert.deepEqual(getConsecutiveMatrixElements(rows, 2), [{ id: 'A-B' }, { id: 'B-C' }]);
});
