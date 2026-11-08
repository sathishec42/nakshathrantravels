const mongoose = require('mongoose');

const paymentEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  razorpayOrderId: { type: String, index: true },
  processedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.models.PaymentEvent || mongoose.model('PaymentEvent', paymentEventSchema);
