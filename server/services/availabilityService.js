const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const { checkTurnaround } = require('./turnaroundService');

const NON_ASSIGNMENT_STATUSES = ['CANCELLED', 'REJECTED'];
const BUFFER_MS = 12 * 60 * 60 * 1000;

async function findAvailableVehicles(vehicles, { startAt, endAt }) {
  if (!vehicles.length) return { vehicles: [], conflicts: [] };
  const vehicleIds = vehicles.map((vehicle) => vehicle._id);
  const drivers = await Driver.find({
    assignedVehicle: { $in: vehicleIds },
    status: 'ACTIVE',
    drivingLicenseExpiry: { $gt: endAt },
  }).populate('user', 'status').select('_id assignedVehicle user').lean();
  const activeDrivers = drivers.filter((driver) => driver.user?.status === 'ACTIVE');
  const driverIds = activeDrivers.map((driver) => driver._id);
  const trips = await Booking.find({
    status: { $nin: NON_ASSIGNMENT_STATUSES },
    startAt: { $lt: new Date(endAt.getTime() + BUFFER_MS) },
    $and: [
      { $or: [{ vehicle: { $in: vehicleIds } }, { driver: { $in: driverIds } }] },
      {
        $or: [
          { actualEndAt: { $gt: new Date(startAt.getTime() - BUFFER_MS) } },
          { actualEndAt: null, endAt: { $gt: new Date(startAt.getTime() - BUFFER_MS) } },
        ],
      },
    ],
  }).select('_id vehicle driver startAt endAt actualEndAt').lean();
  const available = [];
  const conflicts = [];

  for (const vehicle of vehicles) {
    const vehicleTrips = trips.filter((trip) => String(trip.vehicle) === String(vehicle._id));
    const vehicleCheck = checkTurnaround({ startAt, endAt, existingTrips: vehicleTrips });
    const vehicleConflictDetails = vehicleCheck.conflicts.map(({ bookingId, ...conflict }) => ({
      ...conflict,
      resource: 'vehicle',
    }));
    const matchingDrivers = activeDrivers.filter((driver) => String(driver.assignedVehicle) === String(vehicle._id));
    const freeDrivers = matchingDrivers.filter((driver) => checkTurnaround({
      startAt,
      endAt,
      existingTrips: trips.filter((trip) => String(trip.driver) === String(driver._id)),
    }).available);

    if (vehicleCheck.available && freeDrivers.length) {
      available.push({ ...vehicle, availableDriversCount: freeDrivers.length });
      continue;
    }
    const driverConflicts = matchingDrivers.flatMap((driver) => checkTurnaround({
      startAt,
      endAt,
      existingTrips: trips.filter((trip) => String(trip.driver) === String(driver._id)),
    }).conflicts.map(({ bookingId, ...conflict }) => ({ ...conflict, resource: 'driver' })));
    conflicts.push({
      vehicleId: String(vehicle._id),
      reason: !matchingDrivers.length ? 'NO_ACTIVE_DRIVER' : 'TURNAROUND_CONFLICT',
      conflicts: [...vehicleConflictDetails, ...driverConflicts],
    });
  }
  return { vehicles: available, conflicts };
}

module.exports = { findAvailableVehicles };
