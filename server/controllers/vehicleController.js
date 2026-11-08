const asyncHandler = require('../lib/asyncHandler');
const AppError = require('../lib/AppError');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const { findAvailableVehicles } = require('../services/availabilityService');
const { vehicleSearchSchema } = require('../validation/schemas');

const listActive = asyncHandler(async (req, res) => {
  const parsed = vehicleSearchSchema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError(422, 'Vehicle search parameters are invalid.', 'VALIDATION_ERROR', parsed.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })));
  }
  const { type, minSeats, startAt, endAt } = parsed.data;
  const documentValidityDate = endAt || new Date();
  const filter = {
    verificationStatus: 'ACTIVE',
    insuranceExpiryDate: { $gt: documentValidityDate },
    fitnessExpiryDate: { $gt: documentValidityDate },
    pollutionExpiryDate: { $gt: documentValidityDate },
  };
  if (type) filter.type = type;
  if (minSeats) filter.seats = { $gte: minSeats };
  let vehicles = await Vehicle.find(filter)
    .select('type modelName registrationNumber seats airConditioned luggageCapacityLitres luggageBagLimit photoUrls pricing operationalStatus')
    .sort({ seats: 1 })
    .lean();
  let conflicts = [];
  if (startAt && endAt) {
    const availability = await findAvailableVehicles(vehicles, { startAt, endAt });
    vehicles = availability.vehicles;
    conflicts = availability.conflicts;
  } else {
    const activeDrivers = await Driver.find({
      assignedVehicle: { $in: vehicles.map((vehicle) => vehicle._id) },
      status: 'ACTIVE',
      drivingLicenseExpiry: { $gt: documentValidityDate },
    }).populate('user', 'status').select('assignedVehicle user').lean();
    const vehiclesWithDrivers = new Set(activeDrivers
      .filter((driver) => driver.user?.status === 'ACTIVE')
      .map((driver) => String(driver.assignedVehicle)));
    vehicles = vehicles.filter((vehicle) => vehiclesWithDrivers.has(String(vehicle._id)));
  }
  return res.json({ data: vehicles, conflicts });
});

const create = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.create({
    ...req.body,
    owner: req.user.id,
    verificationStatus: 'PENDING_VERIFICATION',
  });
  return res.status(201).json({ data: vehicle });
});

const listMine = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find({ owner: req.user.id })
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ data: vehicles });
});

module.exports = { create, listActive, listMine };
