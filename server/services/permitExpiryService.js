const Permit = require('../models/Permit');

async function expireOutdatedPermits(now = new Date()) {
  const result = await Permit.updateMany(
    { status: { $in: ['VALID', 'ACTIVE'] }, validTo: { $lt: now } },
    { $set: { status: 'EXPIRED' } },
  );
  return result.modifiedCount;
}

module.exports = { expireOutdatedPermits };
