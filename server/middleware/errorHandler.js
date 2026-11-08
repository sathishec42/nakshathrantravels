const mongoose = require('mongoose');
const AppError = require('../lib/AppError');

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let normalized = error;
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    normalized = new AppError(422, error.message, 'DATABASE_VALIDATION_ERROR');
  } else if (error.code === 11000) {
    normalized = new AppError(409, 'A record with the supplied unique value already exists.', 'DUPLICATE_RESOURCE');
  }

  const status = normalized.status || 500;
  if (status >= 500) console.error({ requestId: req.id, error: normalized });
  return res.status(status).json({
    error: {
      code: normalized.code || 'INTERNAL_ERROR',
      message: status >= 500 && !normalized.status ? 'An unexpected error occurred.' : normalized.message,
      ...(normalized.details ? { details: normalized.details } : {}),
      requestId: req.id,
    },
  });
}

module.exports = errorHandler;
