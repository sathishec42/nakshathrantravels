require('dotenv').config();
const crypto = require('node:crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const passport = require('passport');
const { configurePassport } = require('./config/passport');
const AppError = require('./lib/AppError');
const errorHandler = require('./middleware/errorHandler');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const driverRoutes = require('./routes/driverRoutes');
const paymentController = require('./controllers/paymentController');
const paymentRoutes = require('./routes/paymentRoutes');
const placeRoutes = require('./routes/placeRoutes');
const permitRoutes = require('./routes/permitRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

const app = express();
configurePassport();
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new AppError(403, 'Origin is not allowed by CORS.', 'CORS_ORIGIN_DENIED'));
  },
  credentials: true,
}));
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});
app.use(passport.initialize());
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.post(
  '/api/payments/verify-webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  paymentController.verifyWebhook,
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  return res.json({
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    requestId: req.id,
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/permits', permitRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (req, res, next) => next(new AppError(404, 'API route not found.', 'ROUTE_NOT_FOUND')));
app.use(errorHandler);

module.exports = app;
