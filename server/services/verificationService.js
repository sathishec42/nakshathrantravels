const AppError = require('../lib/AppError');
const AuditLog = require('../models/AuditLog');
const Driver = require('../models/Driver');
const Permit = require('../models/Permit');
const Vehicle = require('../models/Vehicle');
const withTransaction = require('../lib/withTransaction');

const targets = {
  vehicle: { model: Vehicle, states: ['ACTIVE', 'REJECTED', 'MAINTENANCE', 'IN_MAINTENANCE', 'RETIRED'] },
  driver: { model: Driver, states: ['ACTIVE', 'REJECTED', 'INACTIVE'] },
  permit: { model: Permit, states: ['ACTIVE', 'VALID', 'REJECTED', 'EXPIRED', 'PENDING_RENEWAL', 'SUSPENDED'] },
};

async function reviewDocument({ actorId, type, id, status, reason, requestId }) {
  const target = targets[type];
  if (!target || !target.states.includes(status)) {
    throw new AppError(422, 'Unsupported verification target or status.', 'INVALID_VERIFICATION_STATUS');
  }
  if (!reason?.trim()) {
    throw new AppError(422, 'A reason is required for verification decisions.', 'REASON_REQUIRED');
  }
  return withTransaction(async (session) => {
    const record = await target.model.findById(id).session(session);
    if (!record) throw new AppError(404, `${type} not found.`, 'RESOURCE_NOT_FOUND');
    const before = record.verificationStatus || record.status;
    if (type === 'vehicle') {
      record.verificationStatus = status;
      record.verificationNote = reason.trim();
    } else {
      record.status = status;
      if (type === 'driver') record.verificationNote = reason.trim();
    }
    if (type === 'driver' && status === 'ACTIVE' && before !== 'ACTIVE') {
      record.currentTripStatus = 'AVAILABLE';
      record.set('restUntil', undefined);
    }
    record.verifiedBy = actorId;
    record.verifiedAt = new Date();
    await record.save({ session });
    await AuditLog.create([{
      actor: actorId,
      action: `${type.toUpperCase()}_VERIFICATION_${status}`,
      resourceType: type,
      resourceId: record._id,
      reason: reason.trim(),
      changes: { from: before, to: status },
      requestId,
    }], { session });
    return record;
  });
}

module.exports = { reviewDocument };
