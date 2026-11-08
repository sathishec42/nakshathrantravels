const AppError = require('../lib/AppError');
const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const { checkTurnaround } = require('./turnaroundService');

const NON_ASSIGNMENT_STATUSES = ['CANCELLED', 'REJECTED'];

async function assertAssignmentsAvailable({ vehicleId, driverId, booking, session }) {
  const [vehicle, driver] = await Promise.all([
    Vehicle.findOne({
      _id: vehicleId,
      verificationStatus: 'ACTIVE',
      insuranceExpiryDate: { $gt: booking.endAt },
      fitnessExpiryDate: { $gt: booking.endAt },
      pollutionExpiryDate: { $gt: booking.endAt },
    }).session(session),
    Driver.findOne({
      _id: driverId,
      status: 'ACTIVE',
      drivingLicenseExpiry: { $gt: booking.endAt },
    }).populate('user', 'status').session(session),
  ]);
  if (!vehicle) throw new AppError(409, 'Only verified active vehicles can be assigned.', 'VEHICLE_NOT_ACTIVE');
  if (!driver || driver.user?.status !== 'ACTIVE') {
    throw new AppError(409, 'Only verified active drivers with active accounts can be assigned.', 'DRIVER_NOT_ACTIVE');
  }
  if (String(driver.assignedVehicle) !== String(vehicle._id)) {
    throw new AppError(409, 'The driver is not assigned to this vehicle.', 'DRIVER_VEHICLE_MISMATCH');
  }
  if (String(driver.fleetOwner) !== String(vehicle.owner)) {
    throw new AppError(409, 'The driver and vehicle belong to different fleet owners.', 'FLEET_OWNER_MISMATCH');
  }
  if (booking.passengers > vehicle.seats) {
    throw new AppError(409, 'The selected vehicle does not have enough seats.', 'VEHICLE_CAPACITY_EXCEEDED');
  }

  const vehiclesToLock = new Set([String(vehicle._id)]);
  const driversToLock = new Set([String(driver._id)]);
  if (booking.vehicle) vehiclesToLock.add(String(booking.vehicle));
  if (booking.driver) driversToLock.add(String(booking.driver));
  for (const id of vehiclesToLock) {
    const filter = { _id: id };
    if (id === String(vehicle._id)) filter.verificationStatus = 'ACTIVE';
    const result = await Vehicle.updateOne(filter, { $inc: { assignmentVersion: 1 } }, { session });
    if (result.matchedCount !== 1) {
      throw new AppError(409, 'Vehicle status changed during assignment.', 'VEHICLE_NOT_ACTIVE');
    }
  }
  for (const id of driversToLock) {
    const filter = { _id: id };
    if (id === String(driver._id)) filter.status = 'ACTIVE';
    const result = await Driver.updateOne(filter, { $inc: { assignmentVersion: 1 } }, { session });
    if (result.matchedCount !== 1) {
      throw new AppError(409, 'Driver status changed during assignment.', 'DRIVER_NOT_ACTIVE');
    }
  }

  const resourceFilter = {
    status: { $nin: NON_ASSIGNMENT_STATUSES },
    $or: [{ vehicle: vehicle._id }, { driver: driver._id }],
    _id: { $ne: booking._id },
  };
  const existingTrips = await Booking.find(resourceFilter)
    .select('_id vehicle driver startAt endAt actualEndAt')
    .session(session)
    .lean();
  const conflicts = [];
  for (const resource of [
    { id: vehicle._id, field: 'vehicle' },
    { id: driver._id, field: 'driver' },
  ]) {
    const relevant = existingTrips.filter((trip) => String(trip[resource.field]) === String(resource.id));
    const check = checkTurnaround({
      startAt: booking.startAt,
      endAt: booking.endAt,
      existingTrips: relevant,
    });
    conflicts.push(...check.conflicts.map((conflict) => ({ ...conflict, resource: resource.field })));
  }
  if (conflicts.length) {
    throw new AppError(409, 'Assignment violates the 12-hour operational buffer.', 'TURNAROUND_CONFLICT', conflicts);
  }
  return { vehicle, driver };
}

module.exports = { assertAssignmentsAvailable };
