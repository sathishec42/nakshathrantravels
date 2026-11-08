const mongoose = require('mongoose');

const fareSchema = new mongoose.Schema({
  baseFare: { type: Number, min: 0, default: 0 },
  distanceKm: { type: Number, min: 0, default: 0 },
  ratePerKm: { type: Number, min: 0, default: 0 },
  distanceFare: { type: Number, min: 0, default: 0 },
  driverBata: { type: Number, min: 0, default: 0 },
  estimatedTolls: { type: Number, min: 0, default: 0 },
  borderTaxes: { type: Number, min: 0, default: 0 },
  surcharges: { type: Number, min: 0, default: 0 },
  waivedFees: { type: Number, min: 0, default: 0 },
  total: { type: Number, min: 0, default: 0 },
  currency: { type: String, enum: ['INR'], default: 'INR' },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', index: true },
  pickup: { type: String, required: true, trim: true },
  dropoff: { type: String, required: true, trim: true },
  waypoints: { type: [{ type: String, trim: true }], default: [] },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true },
  actualEndAt: Date,
  completedAt: Date,
  passengers: { type: Number, required: true, min: 1 },
  route: {
    distanceMeters: { type: Number, min: 0 },
    durationSeconds: { type: Number, min: 0 },
    encodedPolyline: String,
    jurisdictionCodes: [{ type: String, match: /^IN-[A-Z]{2}$/ }],
    warnings: [{
      code: { type: String, maxlength: 60 },
      text: { type: String, maxlength: 500 },
    }],
  },
  permitFlags: {
    type: [{ type: String, enum: ['PERMIT_TAX_REQUIRED', 'BORDER_PERMIT_REQUIRED'] }],
    default: [],
  },
  compliance: {
    permitCompliant: { type: Boolean, default: true },
    borderTaxEstimateComplete: { type: Boolean, default: true },
    taxRequiredStates: [{ type: String, match: /^IN-[A-Z]{2}$/ }],
    notes: { type: String, maxlength: 1000 },
  },
  fare: { type: fareSchema, default: () => ({}) },
  status: {
    type: String,
    enum: ['REQUESTED', 'QUOTED', 'PAYMENT_CREATING', 'PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'],
    default: 'REQUESTED',
    index: true,
  },
  payment: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    paidAt: Date,
    orderCreationId: String,
    orderCreationStartedAt: Date,
  },
  quoteExpiresAt: Date,
}, { timestamps: true });

bookingSchema.index({ vehicle: 1, startAt: 1, endAt: 1, status: 1 });
bookingSchema.index({ driver: 1, startAt: 1, endAt: 1, status: 1 });
bookingSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
