const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');

async function releaseCompletedTurnaroundBuffers(now = new Date()) {
  const restingDrivers = await Driver.find({
    currentTripStatus: 'RESTING',
    restUntil: { $lte: now },
  }).select('_id').lean();
  const driverIds = restingDrivers.map((driver) => driver._id);
  const upcomingDrivers = driverIds.length
    ? await Booking.distinct('driver', {
      driver: { $in: driverIds },
      status: { $nin: ['CANCELLED', 'REJECTED', 'COMPLETED'] },
      startAt: { $gt: now },
    })
    : [];
  const upcomingDriverIds = upcomingDrivers.map(String);
  const [vehicles, assignedDrivers, availableDrivers] = await Promise.all([
    Vehicle.updateMany(
      { operationalStatus: 'RESTING_BUFFER', operationalAvailableAt: { $lte: now } },
      { $set: { operationalStatus: 'AVAILABLE' }, $unset: { operationalAvailableAt: 1 } },
    ),
    upcomingDriverIds.length
      ? Driver.updateMany(
        { _id: { $in: upcomingDriverIds }, currentTripStatus: 'RESTING', restUntil: { $lte: now } },
        { $set: { currentTripStatus: 'ASSIGNED' }, $unset: { restUntil: 1 } },
      )
      : Promise.resolve({ modifiedCount: 0 }),
    Driver.updateMany(
      {
        _id: { $in: driverIds.filter((id) => !upcomingDriverIds.includes(String(id))) },
        currentTripStatus: 'RESTING',
        restUntil: { $lte: now },
      },
      { $set: { currentTripStatus: 'AVAILABLE' }, $unset: { restUntil: 1 } },
    ),
  ]);
  return {
    vehicles: vehicles.modifiedCount,
    drivers: assignedDrivers.modifiedCount + availableDrivers.modifiedCount,
  };
}

module.exports = { releaseCompletedTurnaroundBuffers };
