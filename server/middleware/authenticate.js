const jwt = require('jsonwebtoken');
const AppError = require('../lib/AppError');
const User = require('../models/User');

module.exports = async function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  const token = bearer || req.cookies?.accessToken;
  if (!token) return next(new AppError(401, 'Authentication is required.', 'UNAUTHENTICATED'));

  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    return next(new AppError(503, 'JWT_ACCESS_SECRET must be configured with at least 32 characters.', 'AUTH_NOT_CONFIGURED'));
  }
  try {
    const claims = jwt.verify(token, secret, { issuer: 'nakshathran-travels' });
    if (typeof claims === 'string' || !claims.sub || !claims.role) {
      throw new Error('Invalid access-token claims.');
    }
    const user = await User.findById(claims.sub).select('role status').lean();
    if (!user || user.status !== 'ACTIVE') {
      return next(new AppError(401, 'Account is unavailable.', 'ACCOUNT_DISABLED'));
    }
    req.user = { id: String(user._id), role: user.role };
    return next();
  } catch {
    return next(new AppError(401, 'Access token is invalid or expired.', 'INVALID_ACCESS_TOKEN'));
  }
};
