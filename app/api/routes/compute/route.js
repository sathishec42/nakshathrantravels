import { NextResponse } from 'next/server';
import { calculateFare } from '../../../../lib/pricing';

export async function POST(request) {
  try {
    const body = await request.json();
    const pickup = typeof body.pickup === 'string' ? body.pickup.trim() : '';
    const destination = typeof body.destination === 'string' ? body.destination.trim() : '';
    const stops = Array.isArray(body.stops) ? body.stops : [];
    const orderMode = body.orderMode === 'optimized' ? 'optimized' : 'manual';

    if (!pickup || !destination) {
      return NextResponse.json({ error: 'Pickup and destination are required.' }, { status: 400 });
    }

    const cleanedStops = stops
      .map((stop) => (typeof stop === 'string' ? stop.trim() : ''))
      .filter(Boolean);

    const baseDistanceKm = 240;
    const distanceKm = Number((baseDistanceKm + cleanedStops.length * 18).toFixed(2));
    const durationSeconds = Math.round((distanceKm / 60) * 3600);
    const ratePerKm = Number(process.env.PRICE_PER_KM_INR || 15);
    const estimatedFare = calculateFare(distanceKm, ratePerKm);

    return NextResponse.json({
      ok: true,
      pickup,
      destination,
      orderedStops: cleanedStops,
      stops: cleanedStops,
      orderMode,
      distanceMeters: Math.round(distanceKm * 1000),
      distanceKm,
      durationSeconds,
      durationMinutes: Math.round(durationSeconds / 60),
      routePolyline: 'dummy-polyline',
      pricePerKm: ratePerKm,
      currency: 'INR',
      estimatedFare,
      calculatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate route.' }, { status: 500 });
  }
}
