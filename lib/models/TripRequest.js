import mongoose from 'mongoose';

const TripRequestSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pickup: { type: String, required: true },
    destination: { type: String, required: true },
    stops: [{ type: String }],
    orderMode: { type: String, enum: ['manual', 'optimized'], default: 'manual' },
    distanceMeters: { type: Number },
    distanceKm: { type: Number },
    durationSeconds: { type: Number },
    pricePerKm: { type: Number },
    currency: { type: String, default: 'INR' },
    estimatedFare: { type: Number },
    status: { type: String, default: 'draft', index: true },
    routePolyline: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.TripRequest || mongoose.model('TripRequest', TripRequestSchema);
