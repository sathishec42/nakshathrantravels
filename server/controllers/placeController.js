const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const { getPlaceSuggestions } = require('../services/distanceMatrixService');

const autocomplete = asyncHandler(async (req, res) => {
  const input = typeof req.query.input === 'string' ? req.query.input.trim() : '';
  if (input.length < 3 || input.length > 200) {
    throw new AppError(422, 'Place search input must be between 3 and 200 characters.', 'INVALID_PLACE_QUERY');
  }
  const sessionToken = req.query.sessionToken;
  if (sessionToken !== undefined && (typeof sessionToken !== 'string' || sessionToken.length > 128)) {
    throw new AppError(422, 'Invalid Places session token.', 'INVALID_PLACE_QUERY');
  }
  const suggestions = await getPlaceSuggestions({ input, sessionToken });
  return res.json({ data: suggestions });
});

module.exports = { autocomplete };
