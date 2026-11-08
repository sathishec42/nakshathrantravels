function calculateFare({
  baseFare = 0,
  distanceKm = 0,
  ratePerKm = 0,
  driverBata = 0,
  estimatedTolls = 0,
  borderTaxes = 0,
  surcharges = 0,
  waivedFees = 0,
}) {
  const values = { baseFare, distanceKm, ratePerKm, driverBata, estimatedTolls, borderTaxes, surcharges, waivedFees };
  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(`${name} must be a finite non-negative number.`);
    }
  }
  const distanceFare = distanceKm * ratePerKm;
  const total = Math.max(0, baseFare + distanceFare + driverBata + estimatedTolls + borderTaxes + surcharges - waivedFees);
  return {
    baseFare,
    distanceKm,
    ratePerKm,
    distanceFare: Number(distanceFare.toFixed(2)),
    driverBata,
    estimatedTolls,
    borderTaxes,
    surcharges,
    waivedFees,
    total: Number(total.toFixed(2)),
    currency: 'INR',
  };
}

function calculateDriverBata({ startAt, endAt, dayRate = 0, nightRate = 0 }) {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new TypeError('A valid trip start and an end time after the start are required.');
  }
  if (![dayRate, nightRate].every((rate) => Number.isFinite(rate) && rate >= 0)) {
    throw new TypeError('Driver bata rates must be finite non-negative numbers.');
  }

  const indiaOffsetMs = 330 * 60_000;
  const startInIndia = start + indiaOffsetMs;
  const endInIndia = end + indiaOffsetMs;
  const dayUnits = Math.max(1, Math.ceil((end - start) / 86_400_000));
  let nightUnits = 0;
  let localMidnight = Math.floor(startInIndia / 86_400_000) * 86_400_000;
  while (localMidnight < endInIndia) {
    const nightStart = localMidnight + 22 * 3_600_000;
    const nightEnd = localMidnight + 30 * 3_600_000;
    if (Math.max(startInIndia, nightStart) < Math.min(endInIndia, nightEnd)) nightUnits += 1;
    localMidnight += 86_400_000;
  }

  return {
    dayUnits,
    nightUnits,
    total: dayUnits * dayRate + nightUnits * nightRate,
  };
}

module.exports = { calculateDriverBata, calculateFare };
