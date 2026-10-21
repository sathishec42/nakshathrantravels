import mongoose from 'mongoose';

const VehicleSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    name: { type: String, required: true },
    make: { type: String },
    model: { type: String },
    registrationNumber: { type: String },
    passengerCapacity: { type: Number, default: 0 },
    luggageCapacity: { type: Number, default: 0 },
    features: [{ type: String }],
    images: [{ type: String }],
    documents: [{ type: String }],
    pricingRule: { type: String },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'changes_requested', 'suspended'], default: 'pending' },
    availabilityStatus: { type: String, enum: ['available', 'unavailable', 'maintenance'], default: 'available' },
    serviceAreas: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
