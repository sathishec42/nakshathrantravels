const express = require('express');
const paymentController = require('../controllers/paymentController');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { objectId } = require('../validation/schemas');
const AppError = require('../lib/AppError');

const router = express.Router();

router.post(
  '/create-order',
  authenticate,
  requireRole(['CUSTOMER']),
  (req, res, next) => {
    const result = objectId.safeParse(req.body?.bookingId);
    if (!result.success) return next(new AppError(422, 'A valid bookingId is required.', 'VALIDATION_ERROR'));
    req.body.bookingId = result.data;
    return next();
  },
  paymentController.createOrder,
);

module.exports = router;
