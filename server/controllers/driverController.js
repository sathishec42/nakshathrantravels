const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');

const create = asyncHandler(async (req, res) => {
  const user = await User.findById(req.body.userId).select('role');
  if (!user || user.role !== 'DRIVER') {
    throw new AppError(422, 'The selected account must have the DRIVER role.', 'INVALID_DRIVER_ACCOUNT');
  }
  if (req.body.assignedVehicle) {
    const vehicle = await Vehicle.findOne({ _id: req.body.assignedVehicle, owner: req.user.id });
    if (!vehicle) throw new AppError(404, 'Fleet vehicle not found.', 'VEHICLE_NOT_FOUND');
  }
  const driver = await Driver.create({
    ...req.body,
    fleetOwner: req.user.id,
    status: 'PENDING_VERIFICATION',
  });
  return res.status(201).json({ data: driver });
});

const listMine = asyncHandler(async (req, res) => {
  const drivers = await Driver.find({ fleetOwner: req.user.id })
    .populate('user', 'name email phone status')
    .populate('assignedVehicle', 'type registrationNumber verificationStatus')
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ data: drivers });
});

module.exports = { create, listMine };
