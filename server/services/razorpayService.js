const crypto = require('node:crypto');
const Razorpay = require('razorpay');
const AppError = require('../lib/AppError');
const Booking = require('../models/Booking');
const PaymentEvent = require('../models/PaymentEvent');
const PaymentTransaction = require('../models/PaymentTransaction');
const withTransaction = require('../lib/withTransaction');

async function saveOrderTransaction(booking, order) {
  const customerId = booking.customer?._id || booking.customer;
  await PaymentTransaction.findOneAndUpdate(
    { orderId: order.id },
    {
      $setOnInsert: {
        booking: booking._id,
        customer: customerId,
        provider: 'RAZORPAY',
        amountPaise: order.amount,
        currency: order.currency,
        status: 'ORDER_CREATED',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

function getClient() {
  const { RAZORPAY_KEY_ID: key_id, RAZORPAY_KEY_SECRET: key_secret } = process.env;
  if (!key_id || !key_secret) {
    throw new AppError(503, 'Razorpay is not configured.', 'PAYMENTS_NOT_CONFIGURED');
  }
  return new Razorpay({ key_id, key_secret });
}

async function createOrder({ bookingId, customerId, client = getClient() }) {
  let booking = await Booking.findOne({ _id: bookingId, customer: customerId })
    .populate('customer', 'name email phone');
  if (!booking) throw new AppError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
  if (!booking.compliance?.borderTaxEstimateComplete) {
    throw new AppError(409, 'A verified border-tax amount is required before payment.', 'BORDER_TAX_QUOTE_REQUIRED');
  }
  if (booking.status === 'PENDING_PAYMENT' && booking.payment?.razorpayOrderId) {
    const existing = await client.orders.fetch(booking.payment.razorpayOrderId);
    await saveOrderTransaction(booking, existing);
    return { order: existing, keyId: process.env.RAZORPAY_KEY_ID };
  }
  if (booking.quoteExpiresAt && booking.quoteExpiresAt < new Date()) {
    throw new AppError(409, 'The booking quote has expired; request an updated quote.', 'QUOTE_EXPIRED');
  }
  const claimId = crypto.randomUUID();
  booking = await Booking.findOneAndUpdate({
    _id: bookingId,
    customer: customerId,
    $or: [
      { status: 'QUOTED' },
      {
        status: 'PAYMENT_CREATING',
        'payment.orderCreationStartedAt': { $lt: new Date(Date.now() - 10 * 60 * 1000) },
        quoteExpiresAt: { $gt: new Date() },
      },
    ],
  }, {
    $set: {
      status: 'PAYMENT_CREATING',
      'payment.orderCreationId': claimId,
      'payment.orderCreationStartedAt': new Date(),
    },
  }, { new: true }).populate('customer', 'name email phone');
  if (!booking) {
    const current = await Booking.findOne({ _id: bookingId, customer: customerId });
    if (current?.status === 'PENDING_PAYMENT' && current.payment?.razorpayOrderId) {
      const existing = await client.orders.fetch(current.payment.razorpayOrderId);
      await saveOrderTransaction(current, existing);
      return { order: existing, keyId: process.env.RAZORPAY_KEY_ID };
    }
    throw new AppError(409, 'The booking is not ready for payment or another order is being created.', 'BOOKING_NOT_PAYABLE');
  }
  const amount = Math.round(booking.fare.total * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    await Booking.updateOne(
      { _id: booking._id, status: 'PAYMENT_CREATING', 'payment.orderCreationId': claimId },
      { $set: { status: 'QUOTED' }, $unset: { 'payment.orderCreationId': 1, 'payment.orderCreationStartedAt': 1 } },
    );
    throw new AppError(422, 'The booking quote must be greater than zero.', 'INVALID_PAYMENT_AMOUNT');
  }
  try {
    const order = await client.orders.create({
      amount,
      currency: 'INR',
      receipt: String(booking._id),
      notes: {
        bookingId: String(booking._id),
        customerId: String(booking.customer?._id || booking.customer),
        ...(booking.customer?.name ? { customerName: booking.customer.name } : {}),
        ...(booking.customer?.email ? { customerEmail: booking.customer.email } : {}),
      },
    });
    const result = await Booking.updateOne({
      _id: booking._id,
      status: 'PAYMENT_CREATING',
      'payment.orderCreationId': claimId,
    }, {
      $set: { status: 'PENDING_PAYMENT', 'payment.razorpayOrderId': order.id },
      $unset: { 'payment.orderCreationId': 1, 'payment.orderCreationStartedAt': 1 },
    });
    if (result.modifiedCount !== 1) {
      throw new AppError(409, 'Payment order was created but the booking payment state changed. Contact support.', 'PAYMENT_STATE_CONFLICT');
    }
    await saveOrderTransaction(booking, order);
    return { order, keyId: process.env.RAZORPAY_KEY_ID };
  } catch (error) {
    await Booking.updateOne({
      _id: booking._id,
      status: 'PAYMENT_CREATING',
      'payment.orderCreationId': claimId,
    }, {
      $set: { status: 'QUOTED' },
      $unset: { 'payment.orderCreationId': 1, 'payment.orderCreationStartedAt': 1 },
    });
    throw error;
  }
}

function verifyWebhookSignature(rawBody, signature, webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!Buffer.isBuffer(rawBody) || !signature || !webhookSecret) return false;
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest();
  let actual;
  try {
    actual = Buffer.from(signature, 'hex');
  } catch {
    return false;
  }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

async function processWebhook({ eventId, event, payload }) {
  if (!eventId || !event) {
    throw new AppError(400, 'Razorpay event ID and event type are required.', 'INVALID_WEBHOOK');
  }
  if (event !== 'payment.captured') {
    try {
      await withTransaction(async (session) => {
        await PaymentEvent.create([{ eventId, eventType: event }], { session });
        if (event === 'payment.failed') {
          const payment = payload?.payment?.entity;
          if (payment?.order_id) {
            await PaymentTransaction.updateOne(
              { orderId: payment.order_id, status: { $ne: 'CAPTURED' } },
              { $set: { status: 'FAILED', failureCode: payment.error_code || 'PAYMENT_FAILED' } },
              { session },
            );
          }
        }
      });
    } catch (error) {
      if (error.code === 11000) return { duplicate: true };
      throw error;
    }
    return { duplicate: false, ignored: true };
  }

  const payment = payload?.payment?.entity;
  if (!payment?.id || !payment.order_id) {
    throw new AppError(400, 'The payment capture payload is incomplete.', 'INVALID_WEBHOOK');
  }
  if (payment.currency !== 'INR') {
    throw new AppError(422, 'Captured payment currency does not match the booking currency.', 'PAYMENT_CURRENCY_MISMATCH');
  }
  try {
    return await withTransaction(async (session) => {
      await PaymentEvent.create([{
        eventId,
        eventType: event,
        razorpayOrderId: payment.order_id,
      }], { session });

      const pendingBooking = await Booking.findOne({
        'payment.razorpayOrderId': payment.order_id,
        status: 'PENDING_PAYMENT',
      }).session(session);
      if (!pendingBooking) {
        const alreadyCaptured = await Booking.exists({
          'payment.razorpayOrderId': payment.order_id,
          'payment.razorpayPaymentId': payment.id,
          status: 'CONFIRMED',
        }).session(session);
        if (alreadyCaptured) return { duplicate: true };
        throw new AppError(404, 'No pending booking matches this Razorpay order.', 'BOOKING_NOT_FOUND');
      }
      if (payment.amount !== Math.round(pendingBooking.fare.total * 100)) {
        throw new AppError(422, 'Captured payment amount does not match the booking quote.', 'PAYMENT_AMOUNT_MISMATCH');
      }
      pendingBooking.status = 'CONFIRMED';
      pendingBooking.payment.razorpayPaymentId = payment.id;
      pendingBooking.payment.paidAt = new Date();
      await pendingBooking.save({ session });

      await PaymentTransaction.findOneAndUpdate(
        { orderId: payment.order_id },
        {
          $set: {
            booking: pendingBooking._id,
            customer: pendingBooking.customer,
            paymentId: payment.id,
            amountPaise: payment.amount,
            currency: payment.currency,
            status: 'CAPTURED',
            capturedAt: new Date(),
          },
          $setOnInsert: { provider: 'RAZORPAY' },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, session },
      );
      return { duplicate: false, bookingId: String(pendingBooking._id) };
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return { duplicate: true };
  }
}

module.exports = { createOrder, processWebhook, verifyWebhookSignature };
