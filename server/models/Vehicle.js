const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: [
      'HATCHBACK', 'SEDAN', 'SUV', 'INNOVA_CRYSTA',
      'TEMPO_TRAVELLER', 'TEMPO_TRAVELLER_12', 'TEMPO_TRAVELLER_16',
      'TEMPO_TRAVELLER_20', 'MINI_BUS', 'LUXURY_COACH',
    ],
    required: true,
  },
  modelName: { type: String, trim: true, maxlength: 120 },
  registrationNumber: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/,
  },
  chassisNumber: { type: String, required: true, trim: true, maxlength: 80 },
  engineNumber: { type: String, required: true, trim: true, maxlength: 80 },
  rcNumber: { type: String, required: true, trim: true },
  seats: { type: Number, required: true, min: 1, max: 100 },
  luggageBagLimit: { type: Number, min: 0, default: 2 },
  airConditioned: { type: Boolean, required: true },
  luggageCapacityLitres: { type: Number, min: 0, default: 0 },
  rcDocumentUrl: { type: String, required: true },
  insurancePolicyNumber: { type: String, required: true, trim: true },
  insuranceDocumentUrl: { type: String, required: true },
  insuranceExpiryDate: { type: Date, required: true },
  fitnessCertificateUrl: { type: String, required: true },
  fitnessExpiryDate: { type: Date, required: true },
  pollutionCertificateUrl: { type: String, required: true },
  pollutionExpiryDate: { type: Date, required: true },
  photoUrls: { type: [{ type: String }], default: [] },
  operationalStatus: {
    type: String,
    enum: ['AVAILABLE', 'ON_TRIP', 'RESTING_BUFFER', 'OFF_DUTY'],
    default: 'AVAILABLE',
    index: true,
  },
  operationalAvailableAt: Date,
  pricing: {
    baseFare: { type: Number, min: 0, default: 0 },
    ratePerKm: { type: Number, min: 0, default: 0 },
    driverBataDay: { type: Number, min: 0, default: 0 },
    driverBataNight: { type: Number, min: 0, default: 0 },
  },
  assignmentVersion: { type: Number, default: 0 },
  verificationStatus: {
    type: String,
    enum: ['PENDING_VERIFICATION', 'ACTIVE', 'REJECTED', 'MAINTENANCE', 'IN_MAINTENANCE', 'RETIRED'],
    default: 'PENDING_VERIFICATION',
    index: true,
  },
  verificationNote: { type: String, maxlength: 1000 },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
}, { timestamps: true });

vehicleSchema.index({ registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ chassisNumber: 1 }, { unique: true, sparse: true });
vehicleSchema.index({ verificationStatus: 1, type: 1, seats: 1 });
vehicleSchema.index({ owner: 1, verificationStatus: 1 });

module.exports = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);
