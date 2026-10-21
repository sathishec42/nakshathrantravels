export function calculateFare(distanceKm, ratePerKm = Number(process.env.PRICE_PER_KM_INR || 15)) {
  return Math.round(Number(distanceKm) * Number(ratePerKm));
}

export function distanceInKm(distanceMeters) {
  return Number((Number(distanceMeters || 0) / 1000).toFixed(2));
}
