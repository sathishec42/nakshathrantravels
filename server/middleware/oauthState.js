const crypto = require('node:crypto');
const AppError = require('../lib/AppError');

const COOKIE_NAME = 'oauthState';

function oauthStateSecret() {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError(503, 'OAUTH_STATE_SECRET must be configured with at least 32 characters.', 'OAUTH_NOT_CONFIGURED');
  }
  return secret;
}

function createState() {
  const nonce = crypto.randomBytes(32).toString('base64url');
  const signature = crypto.createHmac('sha256', oauthStateSecret()).update(nonce).digest('base64url');
  return `${nonce}.${signature}`;
}

function isValidState(state) {
  if (typeof state !== 'string') return false;
  const [nonce, signature, extra] = state.split('.');
  if (!nonce || !signature || extra) return false;
  const expected = crypto.createHmac('sha256', oauthStateSecret()).update(nonce).digest();
  const actual = Buffer.from(signature, 'base64url');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function validateOAuthState(req, res, next) {
  const queryState = req.query.state || req.body?.state;
  const cookieState = req.cookies?.[COOKIE_NAME];
  res.clearCookie(COOKIE_NAME, { path: '/api/auth/oauth' });
  if (!queryState || !cookieState || queryState !== cookieState || !isValidState(queryState)) {
    return next(new AppError(401, 'OAuth state validation failed. Restart sign-in.', 'INVALID_OAUTH_STATE'));
  }
  return next();
}

function stateCookieOptions(provider) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || provider === 'apple',
    sameSite: provider === 'apple' ? 'none' : 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/api/auth/oauth',
  };
}

module.exports = { createState, stateCookieOptions, validateOAuthState };
