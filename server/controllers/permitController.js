const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const Permit = require('../models/Permit');
const Vehicle = require('../models/Vehicle');

const create = asyncHandler(async (req, res) => {
  if (req.body.validTo < req.body.validFrom) {
    throw new AppError(422, 'Permit expiry must be on or after its valid-from date.', 'INVALID_PERMIT_DATES');
  }
  const vehicle = await Vehicle.findOne({ _id: req.body.vehicle, owner: req.user.id });
  if (!vehicle) throw new AppError(404, 'Fleet vehicle not found.', 'VEHICLE_NOT_FOUND');
  const permit = await Permit.create({ ...req.body, status: 'PENDING_VERIFICATION' });
  return res.status(201).json({ data: permit });
});

const listMine = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find({ owner: req.user.id }).select('_id').lean();
  const permits = await Permit.find({ vehicle: { $in: vehicles.map((vehicle) => vehicle._id) } })
    .populate('vehicle', 'type registrationNumber')
    .sort({ validTo: 1 })
    .lean();
  return res.json({ data: permits });
});

module.exports = { create, listMine };
