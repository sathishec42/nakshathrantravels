const express = require('express');
const vehicleController = require('../controllers/vehicleController');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { vehicleSchema } = require('../validation/schemas');

const router = express.Router();

router.get('/', vehicleController.listActive);
router.get('/mine', authenticate, requireRole(['FLEET_OWNER', 'ADMIN', 'SUPERADMIN']), vehicleController.listMine);
router.post('/', authenticate, requireRole(['FLEET_OWNER', 'ADMIN', 'SUPERADMIN']), validate(vehicleSchema), vehicleController.create);

module.exports = router;
