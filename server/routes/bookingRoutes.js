const express = require('express');
const bookingController = require('../controllers/bookingController');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { assignmentSchema, bookingSchema, quoteOverrideSchema } = require('../validation/schemas');

const router = express.Router();

router.post('/', authenticate, requireRole(['CUSTOMER', 'ADMIN', 'SUPERADMIN']), validate(bookingSchema), bookingController.create);
router.get('/mine', authenticate, bookingController.listMine);
router.get('/assigned', authenticate, requireRole(['DRIVER']), bookingController.listAssigned);
router.patch('/:id/quote', authenticate, requireRole(['ADMIN', 'SUPERADMIN']), validate(quoteOverrideSchema), bookingController.quote);
router.patch('/:id/assign', authenticate, requireRole(['ADMIN', 'SUPERADMIN']), validate(assignmentSchema), bookingController.assign);
router.patch('/:id/start', authenticate, requireRole(['DRIVER', 'ADMIN', 'SUPERADMIN']), bookingController.startTrip);
router.patch('/:id/complete', authenticate, requireRole(['DRIVER', 'ADMIN', 'SUPERADMIN']), bookingController.completeTrip);
router.patch('/:id/cancel', authenticate, requireRole(['CUSTOMER', 'ADMIN', 'SUPERADMIN']), bookingController.cancel);

module.exports = router;
