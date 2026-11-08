const { getAuth } = require('firebase-admin/auth');
const { cert, getApps, initializeApp } = require('firebase-admin/app');
const AppError = require('../lib/AppError');
const asyncHandler = require('../lib/asyncHandler');
const authService = require('../services/authService');

const isProduction = process.env.NODE_ENV === 'production';

function setSessionCookies(res, tokens) {
  res.cookie('accessToken', tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
    path: '/api',
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function publicSession(res, tokens) {
  setSessionCookies(res, tokens);
  return res.json({ user: tokens.user });
}

const oauthSuccess = asyncHandler(async (req, res) => {
  if (!req.user?.accessToken) throw new AppError(401, 'OAuth authentication failed.', 'OAUTH_FAILED');
  setSessionCookies(res, req.user);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return res.redirect(303, `${frontendUrl.replace(/\/$/, '')}/?auth=success`);
});

function getFirebaseAuth() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) throw new AppError(503, 'Firebase phone authentication is not configured.', 'PHONE_AUTH_NOT_CONFIGURED');
  if (!getApps().length) {
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(rawServiceAccount);
    } catch {
      throw new AppError(500, 'FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON.', 'INVALID_FIREBASE_CONFIG');
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getAuth();
}

const register = asyncHandler(async (req, res) => publicSession(res, await authService.register(req.body)));
const login = asyncHandler(async (req, res) => publicSession(res, await authService.login(req.body)));
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!refreshToken) throw new AppError(401, 'A refresh token is required.', 'INVALID_REFRESH_TOKEN');
  return publicSession(res, await authService.refresh(refreshToken));
});
const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  res.clearCookie('accessToken', { path: '/api' });
  res.clearCookie('refreshToken', { path: '/api/auth' });
  return res.status(204).end();
});
const verifyFirebasePhone = asyncHandler(async (req, res) => {
  const { idToken } = req.body || {};
  const firebaseAuth = getFirebaseAuth();
  let decoded;
  try {
    decoded = await firebaseAuth.verifyIdToken(idToken, true);
  } catch {
    throw new AppError(401, 'Firebase phone-auth token is invalid or expired.', 'INVALID_PHONE_TOKEN');
  }
  if (decoded.firebase?.sign_in_provider !== 'phone' || !decoded.phone_number) {
    throw new AppError(401, 'The Firebase token must represent a verified phone sign-in.', 'PHONE_NOT_VERIFIED');
  }
  return publicSession(res, await authService.loginWithVerifiedPhone(decoded.phone_number, decoded.uid));
});

const currentUser = asyncHandler(async (req, res) => {
  const User = require('../models/User');
  const user = await User.findById(req.user.id).select('name email phone role').lean();
  if (!user) throw new AppError(401, 'Account is unavailable.', 'ACCOUNT_DISABLED');
  return res.json({ user: { id: String(user._id), name: user.name, email: user.email, phone: user.phone, role: user.role } });
});

module.exports = { currentUser, login, logout, oauthSuccess, refresh, register, verifyFirebasePhone };
