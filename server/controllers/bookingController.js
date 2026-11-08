const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const AuditLog = require('../models/AuditLog');
const Booking = require('../models/Booking');
const Permit = require('../models/Permit');
const Vehicle = require('../models/Vehicle');
const { assertAssignmentsAvailable } = require('../services/assignmentService');
const { getDirections, getDistanceMatrix } = require('../services/distanceMatrixService');
const { evaluatePermits } = require('../services/permitService');
const { calculateDriverBata, calculateFare } = require('../services/pricingService');
const withTransaction = require('../lib/withTransaction');
const Driver = require('../models/Driver');

async function refreshDriverTripStatus(driverId, excludedBookingId, session) {
  if (!driverId) return;
  const driver = await Driver.findById(driverId).session(session);
  if (!driver || driver.status === 'ON_TRIP') return;
  const now = new Date();
  if (driver.restUntil && driver.restUntil > now) {
    driver.currentTripStatus = 'RESTING';
  } else {
    const hasUpcomingAssignment = await Booking.exists({
      _id: { $ne: excludedBookingId },
      driver: driver._id,
      status: { $nin: ['CANCELLED', 'REJECTED', 'COMPLETED'] },
      startAt: { $gt: now },
    }).session(session);
    driver.currentTripStatus = hasUpcomingAssignment ? 'ASSIGNED' : 'AVAILABLE';
    if (!hasUpcomingAssignment) driver.set('restUntil', undefined);
  }
  await driver.save({ session });
}

function getTaxEstimates() {
  const rawEstimates = process.env.BORDER_TAX_ESTIMATES_INR;
  if (!rawEstimates) return {};
  try {
    const parsed = JSON.parse(rawEstimates);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Expected object.');
    return parsed;
  } catch {
    throw new AppError(500, 'BORDER_TAX_ESTIMATES_INR must be a JSON object.', 'INVALID_TAX_CONFIG');
  }
}

const create = asyncHandler(async (req, res) => {
  const vehicle = req.body.vehicleId
    ? await Vehicle.findOne({
      _id: req.body.vehicleId,
      verificationStatus: 'ACTIVE',
      insuranceExpiryDate: { $gt: req.body.endAt },
      fitnessExpiryDate: { $gt: req.body.endAt },
      pollutionExpiryDate: { $gt: req.body.endAt },
    })
    : null;
  if (req.body.vehicleId && !vehicle) {
    throw new AppError(409, 'Only active verified vehicles can be selected.', 'VEHICLE_NOT_ACTIVE');
  }
  if (vehicle && req.body.passengers > vehicle.seats) {
    throw new AppError(422, 'Passenger count exceeds vehicle capacity.', 'VEHICLE_CAPACITY_EXCEEDED');
  }

  const locations = [req.body.pickup, ...(req.body.waypoints || []), req.body.dropoff];
  const [route, matrix] = await Promise.all([getDirections({
    origin: req.body.pickup,
    destination: req.body.dropoff,
    waypoints: req.body.waypoints,
  }), getDistanceMatrix({ locations, departureTime: req.body.startAt })]);
  route.distanceMeters = matrix.distanceMeters;
  route.durationSeconds = matrix.durationSeconds;
  if (req.body.endAt.getTime() - req.body.startAt.getTime() < route.durationSeconds * 1000) {
    throw new AppError(422, 'The scheduled trip window is shorter than the mapped drive time.', 'TRIP_WINDOW_TOO_SHORT');
  }
  const permits = vehicle ? await Permit.find({ vehicle: vehicle._id }).lean() : [];
  const permitResult = evaluatePermits({
    traversedStates: route.jurisdictionCodes,
    permits,
    tripDate: req.body.startAt,
    tripEnd: req.body.endAt,
    taxEstimates: getTaxEstimates(),
  });
  const distanceKm = route.distanceMeters / 1000;
  const driverBata = vehicle
    ? calculateDriverBata({
      startAt: req.body.startAt,
      endAt: req.body.endAt,
      dayRate: vehicle.pricing?.driverBataDay || 0,
      nightRate: vehicle.pricing?.driverBataNight || 0,
    }).total
    : 0;
  const fare = calculateFare({
    baseFare: vehicle?.pricing?.baseFare || 0,
    distanceKm,
    ratePerKm: vehicle?.pricing?.ratePerKm || 0,
    driverBata,
    borderTaxes: permitResult.estimatedBorderTax || 0,
  });
  const booking = await Booking.create({
    customer: req.user.id,
    vehicle: vehicle?._id,
    ...req.body,
    route,
    permitFlags: permitResult.flags,
    compliance: {
      permitCompliant: permitResult.compliant,
      borderTaxEstimateComplete: permitResult.estimateComplete,
      taxRequiredStates: permitResult.taxRequiredStates,
      notes: permitResult.message,
    },
    fare,
    status: 'REQUESTED',
  });
  return res.status(201).json({
    data: booking,
    compliance: permitResult,
    priceNeedsQuote: !vehicle || fare.total === 0,
  });
});

const listMine = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ customer: req.user.id })
    .populate('vehicle', 'type registrationNumber seats verificationStatus')
    .populate('driver', 'user status')
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ data: bookings });
});

const listAssigned = asyncHandler(async (req, res) => {
  const driver = await Driver.findOne({ user: req.user.id }).select('_id').lean();
  if (!driver) throw new AppError(404, 'Driver profile not found.', 'DRIVER_PROFILE_NOT_FOUND');
  const bookings = await Booking.find({ driver: driver._id, status: { $nin: ['CANCELLED', 'REJECTED'] } })
    .populate('customer', 'name phone')
    .populate('vehicle', 'type registrationNumber seats')
    .sort({ startAt: 1 })
    .lean();
  return res.json({ data: bookings });
});

const quote = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (session) => {
    const booking = await Booking.findById(req.params.id).session(session);
    if (!booking) throw new AppError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
    if (!['REQUESTED', 'QUOTED'].includes(booking.status)) {
      throw new AppError(409, 'This booking can no longer be quoted.', 'BOOKING_NOT_QUOTABLE');
    }
    if (!booking.compliance.borderTaxEstimateComplete && req.body.borderTaxes === undefined) {
      throw new AppError(409, 'A verified border-tax amount is required before sending this quote.', 'BORDER_TAX_QUOTE_REQUIRED', {
        states: booking.compliance.taxRequiredStates,
      });
    }
    const previous = booking.fare.toObject();
    booking.fare = calculateFare({
      ...previous,
      ...req.body,
    });
    booking.status = 'QUOTED';
    if (req.body.borderTaxes !== undefined) booking.compliance.borderTaxEstimateComplete = true;
    booking.quoteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await booking.save({ session });
    await AuditLog.create([{
      actor: req.user.id,
      action: 'BOOKING_QUOTE_OVERRIDDEN',
      resourceType: 'booking',
      resourceId: booking._id,
      reason: req.body.reason,
      changes: { from: previous, to: booking.fare.toObject() },
      requestId: req.id,
    }], { session });
    return booking;
  });
  return res.json({ data: result });
});

const assign = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (session) => {
    const booking = await Booking.findById(req.params.id).session(session);
    if (!booking) throw new AppError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
    if (!['REQUESTED', 'QUOTED'].includes(booking.status)) {
      throw new AppError(409, 'This booking cannot be assigned in its current state.', 'BOOKING_NOT_ASSIGNABLE');
    }
    const previousDriver = booking.driver ? String(booking.driver) : null;
    const { vehicle, driver } = await assertAssignmentsAvailable({
      vehicleId: req.body.vehicleId,
      driverId: req.body.driverId,
      booking,
      session,
    });
    const permits = await Permit.find({ vehicle: vehicle._id }).session(session).lean();
    const permitResult = evaluatePermits({
      traversedStates: booking.route?.jurisdictionCodes || [],
      permits,
      tripDate: booking.startAt,
      tripEnd: booking.endAt,
      taxEstimates: getTaxEstimates(),
    });
    booking.vehicle = vehicle._id;
    booking.driver = driver._id;
    if (['AVAILABLE', 'ASSIGNED'].includes(driver.currentTripStatus)) {
      driver.currentTripStatus = 'ASSIGNED';
      await driver.save({ session });
    }
    booking.permitFlags = permitResult.flags;
    booking.compliance.permitCompliant = permitResult.compliant;
    booking.compliance.borderTaxEstimateComplete = permitResult.estimateComplete;
    booking.compliance.taxRequiredStates = permitResult.taxRequiredStates;
    booking.compliance.notes = permitResult.message;
    if (permitResult.estimatedBorderTax !== null) {
      booking.fare.borderTaxes = permitResult.estimatedBorderTax;
      booking.fare = calculateFare(booking.fare.toObject());
    }
    await booking.save({ session });
    if (previousDriver && String(previousDriver) !== String(driver._id)) {
      await refreshDriverTripStatus(previousDriver, booking._id, session);
    }
    await AuditLog.create([{
      actor: req.user.id,
      action: 'BOOKING_ASSIGNMENT_CREATED',
      resourceType: 'booking',
      resourceId: booking._id,
      changes: { vehicle: vehicle._id, driver: driver._id, permitFlags: permitResult.flags },
      requestId: req.id,
    }], { session });
    return { booking, permitResult };
  });
  return res.json({ data: result.booking, compliance: result.permitResult });
});

const startTrip = asyncHandler(async (req, res) => {
  const booking = await withTransaction(async (session) => {
    const record = await Booking.findById(req.params.id).session(session);
    if (!record) throw new AppError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
    if (record.status !== 'CONFIRMED' || !record.driver) {
      throw new AppError(409, 'Only a confirmed booking with an assigned driver can start.', 'BOOKING_NOT_STARTABLE');
    }
    const [driver, vehicle] = await Promise.all([
      Driver.findById(record.driver).populate('user', 'status').session(session),
      Vehicle.findById(record.vehicle).session(session),
    ]);
    if (!driver?.user || (req.user.role === 'DRIVER' && String(driver.user._id) !== req.user.id)) {
      throw new AppError(403, 'Only the assigned driver or an administrator can start this trip.', 'FORBIDDEN');
    }
    if (driver.status !== 'ACTIVE' || driver.user?.status !== 'ACTIVE'
      || !driver.drivingLicenseExpiry || driver.drivingLicenseExpiry <= record.endAt) {
      throw new AppError(409, 'The assigned driver is not active or their license expires before trip completion.', 'DRIVER_NOT_ACTIVE');
    }
    if (!vehicle || vehicle.verificationStatus !== 'ACTIVE'
      || !vehicle.insuranceExpiryDate || !vehicle.fitnessExpiryDate || !vehicle.pollutionExpiryDate
      || vehicle.insuranceExpiryDate <= record.endAt
      || vehicle.fitnessExpiryDate <= record.endAt
      || vehicle.pollutionExpiryDate <= record.endAt) {
      throw new AppError(409, 'The assigned vehicle is not active or its compliance documents expire before trip completion.', 'VEHICLE_NOT_ACTIVE');
    }
    if (String(driver.assignedVehicle) !== String(vehicle._id)) {
      throw new AppError(409, 'The assigned driver is no longer linked to this vehicle.', 'DRIVER_VEHICLE_MISMATCH');
    }
    record.status = 'IN_PROGRESS';
    driver.status = 'ON_TRIP';
    driver.currentTripStatus = 'ON_TRIP';
    await record.save({ session });
    await driver.save({ session });
    if (vehicle) {
      vehicle.operationalStatus = 'ON_TRIP';
      await vehicle.save({ session });
    }
    await AuditLog.create([{
      actor: req.user.id,
      action: 'BOOKING_TRIP_STARTED',
      resourceType: 'booking',
      resourceId: record._id,
      requestId: req.id,
    }], { session });
    return record;
  });
  return res.json({ data: booking });
});

const completeTrip = asyncHandler(async (req, res) => {
  const booking = await withTransaction(async (session) => {
    const record = await Booking.findById(req.params.id).session(session);
    if (!record) throw new AppError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
    if (record.status !== 'IN_PROGRESS' || !record.driver) {
      throw new AppError(409, 'Only an in-progress booking can be completed.', 'BOOKING_NOT_COMPLETABLE');
    }
    const [driver, vehicle] = await Promise.all([
      Driver.findById(record.driver).populate('user', 'status').session(session),
      Vehicle.findById(record.vehicle).session(session),
    ]);
    if (!driver?.user || (req.user.role === 'DRIVER' && String(driver.user._id) !== req.user.id)) {
      throw new AppError(403, 'Only the assigned driver or an administrator can complete this trip.', 'FORBIDDEN');
    }
    if (driver.status !== 'ON_TRIP') {
      throw new AppError(409, 'The assigned driver is not marked as on-trip.', 'DRIVER_NOT_ON_TRIP');
    }
    record.status = 'COMPLETED';
    record.actualEndAt = new Date();
    record.completedAt = record.actualEndAt;
    driver.status = 'ACTIVE';
    driver.currentTripStatus = 'RESTING';
    driver.restUntil = new Date(record.actualEndAt.getTime() + 12 * 60 * 60 * 1000);
    if (vehicle) {
      vehicle.operationalStatus = 'RESTING_BUFFER';
      vehicle.operationalAvailableAt = driver.restUntil;
    }
    await record.save({ session });
    await driver.save({ session });
    if (vehicle) await vehicle.save({ session });
    await AuditLog.create([{
      actor: req.user.id,
      action: 'BOOKING_TRIP_COMPLETED',
      resourceType: 'booking',
      resourceId: record._id,
      requestId: req.id,
    }], { session });
    return record;
  });
  return res.json({ data: booking });
});

const cancel = asyncHandler(async (req, res) => {
  const booking = await withTransaction(async (session) => {
    const record = await Booking.findById(req.params.id).session(session);
    if (!record) throw new AppError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
    if (req.user.role === 'CUSTOMER' && String(record.customer) !== req.user.id) {
      throw new AppError(403, 'You can only cancel your own booking.', 'FORBIDDEN');
    }
    if (!['REQUESTED', 'QUOTED'].includes(record.status)) {
      throw new AppError(409, 'Paid or started bookings require an administrator refund workflow.', 'BOOKING_NOT_CANCELLABLE');
    }
    record.status = 'CANCELLED';
    await record.save({ session });
    await refreshDriverTripStatus(record.driver, record._id, session);
    await AuditLog.create([{
      actor: req.user.id,
      action: 'BOOKING_CANCELLED',
      resourceType: 'booking',
      resourceId: record._id,
      requestId: req.id,
    }], { session });
    return record;
  });
  return res.json({ data: booking });
});

module.exports = { assign, cancel, completeTrip, create, listAssigned, listMine, quote, startTrip };
