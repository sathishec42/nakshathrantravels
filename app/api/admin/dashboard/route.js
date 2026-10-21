import { NextResponse } from 'next/server';

export async function GET() {
  const dashboard = {
    totalCustomers: 1842,
    pendingOwnerApprovals: 12,
    pendingDriverApprovals: 8,
    pendingAgentApprovals: 5,
    pendingVehicleApprovals: 9,
    activeVehicles: 28,
    totalBookings: 324,
    pendingBookings: 47,
    completedTrips: 612,
    cancelledBookings: 26,
    revenueVerified: '₹4.8L',
    pendingCommissions: '₹1.2L',
  };

  return NextResponse.json({ ok: true, dashboard });
}
