const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const paymentService = require('../services/razorpayService');

const createOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.createOrder({
    bookingId: req.body.bookingId,
    customerId: req.user.id,
  });
  return res.status(201).json({ data: result });
});

const verifyWebhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  if (!paymentService.verifyWebhookSignature(req.body, signature)) {
    throw new AppError(400, 'Razorpay webhook signature is invalid.', 'INVALID_WEBHOOK_SIGNATURE');
  }
  let body;
  try {
    body = JSON.parse(req.body.toString('utf8'));
  } catch {
    throw new AppError(400, 'Razorpay webhook body is not valid JSON.', 'INVALID_WEBHOOK');
  }
  const result = await paymentService.processWebhook({
    eventId: req.get('x-razorpay-event-id'),
    event: body.event,
    payload: body.payload,
  });
  return res.status(200).json({ received: true, ...result });
});

module.exports = { createOrder, verifyWebhook };
