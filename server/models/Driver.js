const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fleetOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  drivingLicenseNumber: { type: String, required: true, uppercase: true, trim: true },
  drivingLicenseBadgeNumber: { type: String, required: true, trim: true, maxlength: 40 },
  drivingLicenseExpiry: { type: Date, required: true },
  licenseDocumentUrl: { type: String, required: true },
  policeVerificationDocumentUrl: { type: String, required: true },
  aadhaarVerificationDocumentUrl: { type: String, required: true },
  emergencyContactName: { type: String, required: true, trim: true, maxlength: 120 },
  emergencyContactPhone: { type: String, required: true, trim: true, maxlength: 20 },
  currentTripStatus: {
    type: String,
    enum: ['AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'RESTING'],
    default: 'AVAILABLE',
    index: true,
  },
  restUntil: Date,
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true },
  assignmentVersion: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['PENDING_VERIFICATION', 'ACTIVE', 'ON_TRIP', 'INACTIVE', 'REJECTED'],
    default: 'PENDING_VERIFICATION',
    index: true,
  },
  verificationNote: { type: String, maxlength: 1000 },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
}, { timestamps: true });

driverSchema.index({ drivingLicenseNumber: 1 }, { unique: true });
driverSchema.index({ status: 1, assignedVehicle: 1 });
driverSchema.index({ fleetOwner: 1, status: 1 });

module.exports = mongoose.models.Driver || mongoose.model('Driver', driverSchema);
