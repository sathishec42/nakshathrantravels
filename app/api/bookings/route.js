import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    bookings: [],
    message: 'Booking placeholder endpoint. Replace with real MongoDB booking records when database is configured.',
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const vehicleId = typeof body.vehicleId === 'string' ? body.vehicleId : '';
    const customerId = typeof body.customerId === 'string' ? body.customerId : 'dummy-customer';

    if (!vehicleId) {
      return NextResponse.json({ error: 'Vehicle selection is required.' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      booking: {
        id: `booking_${Date.now()}`,
        vehicleId,
        customerId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create booking.' }, { status: 500 });
  }
}
