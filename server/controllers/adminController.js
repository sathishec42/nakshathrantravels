const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const AuditLog = require('../models/AuditLog');
const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const Permit = require('../models/Permit');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const withTransaction = require('../lib/withTransaction');
const { reviewDocument } = require('../services/verificationService');

const review = asyncHandler(async (req, res) => {
  const record = await reviewDocument({
    actorId: req.user.id,
    type: req.params.type,
    id: req.params.id,
    status: req.body.status,
    reason: req.body.reason,
    requestId: req.id,
  });
  return res.json({ data: record });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const allowedRoles = ['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN', 'SUPERADMIN'];
  if (!allowedRoles.includes(req.body.role)) {
    throw new AppError(422, 'Unsupported account role.', 'INVALID_ROLE');
  }
  if (req.body.role === 'SUPERADMIN' && req.user.role !== 'SUPERADMIN') {
    throw new AppError(403, 'Only a superadmin can grant the SUPERADMIN role.', 'FORBIDDEN');
  }
  if (String(req.params.id) === req.user.id && req.body.role !== req.user.role) {
    throw new AppError(403, 'An administrator cannot change their own role.', 'SELF_ROLE_CHANGE_FORBIDDEN');
  }
  const result = await withTransaction(async (session) => {
    const user = await User.findById(req.params.id).session(session);
    if (!user) throw new AppError(404, 'User not found.', 'USER_NOT_FOUND');
    const previous = user.role;
    user.role = req.body.role;
    await user.save({ session });
    await AuditLog.create([{
      actor: req.user.id,
      action: 'USER_ROLE_UPDATED',
      resourceType: 'user',
      resourceId: user._id,
      reason: req.body.reason,
      changes: { from: previous, to: user.role },
      requestId: req.id,
    }], { session });
    return { id: user.id, role: user.role };
  });
  return res.json({ data: result });
});

const auditTrail = asyncHandler(async (req, res) => {
  const requestedLimit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw new AppError(422, 'Audit limit must be a positive integer.', 'INVALID_LIMIT');
  }
  const limit = Math.min(requestedLimit, 100);
  const entries = await AuditLog.find({ resourceType: req.params.type, resourceId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actor', 'name email role')
    .lean();
  return res.json({ data: entries });
});

const pendingVerifications = asyncHandler(async (req, res) => {
  const models = {
    vehicle: { model: Vehicle, field: 'verificationStatus' },
    driver: { model: Driver, field: 'status' },
    permit: { model: Permit, field: 'status' },
  };
  const target = models[req.params.type];
  if (!target) throw new AppError(404, 'Unsupported verification type.', 'RESOURCE_NOT_FOUND');
  const requestedLimit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    throw new AppError(422, 'Limit must be a positive integer.', 'INVALID_LIMIT');
  }
  const records = await target.model.find({ [target.field]: 'PENDING_VERIFICATION' })
    .sort({ createdAt: 1 })
    .limit(Math.min(requestedLimit, 100))
    .populate(req.params.type === 'vehicle' ? 'owner' : req.params.type === 'driver' ? 'user fleetOwner assignedVehicle' : 'vehicle')
    .lean();
  return res.json({ data: records });
});

const dispatchQueue = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ status: { $in: ['REQUESTED', 'QUOTED', 'PENDING_PAYMENT'] } })
    .populate('customer', 'name email phone')
    .populate('vehicle', 'type registrationNumber seats verificationStatus')
    .populate('driver', 'user status')
    .sort({ startAt: 1 })
    .limit(100)
    .lean();
  return res.json({ data: bookings });
});

module.exports = { auditTrail, dispatchQueue, pendingVerifications, review, updateUserRole };
