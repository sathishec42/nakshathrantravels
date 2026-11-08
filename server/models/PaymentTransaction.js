const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['RAZORPAY'], default: 'RAZORPAY', required: true },
  orderId: { type: String, required: true, unique: true },
  paymentId: { type: String, unique: true, sparse: true },
  amountPaise: { type: Number, required: true, min: 1 },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  status: { type: String, enum: ['ORDER_CREATED', 'CAPTURED', 'FAILED', 'REFUNDED'], default: 'ORDER_CREATED', index: true },
  capturedAt: Date,
  failureCode: String,
}, { timestamps: true });

paymentTransactionSchema.index({ booking: 1, createdAt: -1 });

module.exports = mongoose.models.PaymentTransaction || mongoose.model('PaymentTransaction', paymentTransactionSchema);
