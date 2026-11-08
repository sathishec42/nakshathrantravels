const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { autocomplete } = require('../controllers/placeController');

const router = express.Router();
router.get('/autocomplete', rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}), autocomplete);

module.exports = router;
