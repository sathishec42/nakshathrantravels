import { NextResponse } from 'next/server';
import { calculateFare } from '@/lib/pricing';

export async function GET() {
  return NextResponse.json({
    ok: true,
    trips: [],
    message: 'Trip list endpoint placeholder. Add real database persistence with dummy envs enabled.',
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const pickup = typeof body.pickup === 'string' ? body.pickup.trim() : '';
    const destination = typeof body.destination === 'string' ? body.destination.trim() : '';
    const stops = Array.isArray(body.stops) ? body.stops : [];

    if (!pickup || !destination) {
      return NextResponse.json({ error: 'Pickup and destination are required.' }, { status: 400 });
    }

    const stopsCleaned = stops.map((stop) => typeof stop === 'string' ? stop.trim() : '').filter(Boolean);
    const distanceKm = Number((240 + stopsCleaned.length * 18).toFixed(2));
    const fare = calculateFare(distanceKm, Number(process.env.PRICE_PER_KM_INR || 15));

    const result = {
      id: `trip_${Date.now()}`,
      pickup,
      destination,
      stops: stopsCleaned,
      orderMode: body.orderMode === 'optimized' ? 'optimized' : 'manual',
      distanceMeters: Math.round(distanceKm * 1000),
      distanceKm,
      durationSeconds: Math.round((distanceKm / 60) * 3600),
      estimatedFare: fare,
      currency: 'INR',
      status: 'saved',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, trip: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save trip.' }, { status: 500 });
  }
}
