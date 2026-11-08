const express = require('express');
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { objectId, reviewSchema, roleUpdateSchema } = require('../validation/schemas');
const AppError = require('../lib/AppError');

const router = express.Router();

router.use(authenticate);
router.use(requireRole(['ADMIN', 'SUPERADMIN']));
router.get('/verification/:type', adminController.pendingVerifications);
router.get('/bookings', adminController.dispatchQueue);
router.patch('/verification/:type/:id', validate(reviewSchema), adminController.review);
router.get('/audit/:type/:id', (req, res, next) => {
  if (!objectId.safeParse(req.params.id).success) return next(new AppError(422, 'A valid resource ID is required.', 'VALIDATION_ERROR'));
  return next();
}, adminController.auditTrail);
router.patch('/users/:id/role', validate(roleUpdateSchema), (req, res, next) => {
  if (!objectId.safeParse(req.params.id).success) return next(new AppError(422, 'A valid user ID is required.', 'VALIDATION_ERROR'));
  return next();
}, adminController.updateUserRole);

module.exports = router;
