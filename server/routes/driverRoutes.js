const express = require('express');
const driverController = require('../controllers/driverController');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { driverSchema } = require('../validation/schemas');

const router = express.Router();

router.get('/mine', authenticate, requireRole(['FLEET_OWNER', 'ADMIN', 'SUPERADMIN']), driverController.listMine);
router.post('/', authenticate, requireRole(['FLEET_OWNER', 'ADMIN', 'SUPERADMIN']), validate(driverSchema), driverController.create);

module.exports = router;
