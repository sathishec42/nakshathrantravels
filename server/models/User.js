const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['google', 'apple', 'facebook', 'github', 'firebase-phone'],
    required: true,
  },
  subject: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 120 },
  email: { type: String, lowercase: true, trim: true, sparse: true },
  phone: { type: String, trim: true, sparse: true },
  passwordHash: { type: String, select: false },
  role: {
    type: String,
    enum: ['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN', 'SUPERADMIN'],
    default: 'CUSTOMER',
    required: true,
    index: true,
  },
  status: { type: String, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE', index: true },
  providers: { type: [providerSchema], default: [] },
  lastLoginAt: Date,
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ 'providers.name': 1, 'providers.subject': 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
