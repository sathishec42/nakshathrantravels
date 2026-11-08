const express = require('express');
const permitController = require('../controllers/permitController');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const { permitSchema } = require('../validation/schemas');

const router = express.Router();

router.get('/mine', authenticate, requireRole(['FLEET_OWNER', 'ADMIN', 'SUPERADMIN']), permitController.listMine);
router.post('/', authenticate, requireRole(['FLEET_OWNER', 'ADMIN', 'SUPERADMIN']), validate(permitSchema), permitController.create);

module.exports = router;
