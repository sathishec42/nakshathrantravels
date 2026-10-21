import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    passwordHash: { type: String },
    roles: [{ type: String, enum: ['customer', 'vehicle_owner', 'driver', 'agent', 'admin'] }],
    accountStatus: { type: String, default: 'active' },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
