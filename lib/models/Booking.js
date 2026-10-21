import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    tripRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'TripRequest' },
    bookingReference: { type: String, unique: true, index: true },
    pickup: { type: String },
    destination: { type: String },
    passengerCount: { type: Number, default: 1 },
    fareSnapshot: { type: Number },
    status: { type: String, default: 'pending', index: true },
    paymentStatus: { type: String, default: 'pending' },
  },
  { timestamps: true }
);

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
