const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../lib/AppError');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret(name) {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new AppError(503, `${name} must be configured with at least 32 characters.`, 'AUTH_NOT_CONFIGURED');
  }
  return value;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signTokens(user) {
  const claims = { sub: user.id, role: user.role };
  return {
    accessToken: jwt.sign(claims, secret('JWT_ACCESS_SECRET'), { expiresIn: ACCESS_TTL, issuer: 'nakshathran-travels' }),
    refreshToken: jwt.sign({
      sub: user.id,
      type: 'refresh',
      jti: crypto.randomUUID(),
    }, secret('JWT_REFRESH_SECRET'), { expiresIn: REFRESH_TTL, issuer: 'nakshathran-travels' }),
  };
}

async function saveSession(user) {
  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'This account is disabled.', 'ACCOUNT_DISABLED');
  }
  const tokens = signTokens(user);
  user.lastLoginAt = new Date();
  await user.save();
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(tokens.refreshToken),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { ...tokens, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } };
}

async function register({ name, email, password, phone }) {
  const normalizedEmail = email.toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw new AppError(409, 'An account with this email already exists.', 'EMAIL_IN_USE');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email: normalizedEmail,
    phone,
    passwordHash,
    role: 'CUSTOMER',
  });
  return saveSession(user);
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  }
  return saveSession(user);
}

async function refresh(refreshToken) {
  const refreshSecret = secret('JWT_REFRESH_SECRET');
  let claims;
  try {
    claims = jwt.verify(refreshToken, refreshSecret, { issuer: 'nakshathran-travels' });
  } catch {
    throw new AppError(401, 'Refresh token is invalid or expired.', 'INVALID_REFRESH_TOKEN');
  }
  if (claims.type !== 'refresh') {
    throw new AppError(401, 'Refresh token is invalid.', 'INVALID_REFRESH_TOKEN');
  }
  const now = new Date();
  const storedToken = await RefreshToken.findOneAndUpdate({
    user: claims.sub,
    tokenHash: hashToken(refreshToken),
    revokedAt: { $exists: false },
    expiresAt: { $gt: now },
  }, { $set: { revokedAt: now } }, { new: true });
  if (!storedToken) {
    throw new AppError(401, 'Refresh token has been revoked.', 'INVALID_REFRESH_TOKEN');
  }
  const user = await User.findById(claims.sub);
  if (!user) throw new AppError(401, 'Refresh token has been revoked.', 'INVALID_REFRESH_TOKEN');
  return saveSession(user);
}

async function logout(userId) {
  await RefreshToken.updateMany(
    { user: userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

async function loginWithVerifiedPhone(phone, providerSubject) {
  let user = await User.findOne({ 'providers.name': 'firebase-phone', 'providers.subject': providerSubject });
  if (!user) {
    user = await User.findOne({ phone });
    if (user) {
      user.providers.push({ name: 'firebase-phone', subject: providerSubject, emailVerified: false });
    } else {
      user = new User({
        phone,
        role: 'CUSTOMER',
        providers: [{ name: 'firebase-phone', subject: providerSubject, emailVerified: false }],
      });
    }
  }
  return saveSession(user);
}

async function loginWithProvider(provider, subject, { name, email, emailVerified = false }) {
  let user = await User.findOne({ providers: { $elemMatch: { name: provider, subject } } });
  if (!user && email && emailVerified) {
    user = await User.findOne({ email: email.toLowerCase() });
  }
  if (!user) {
    user = new User({
      name,
      email: email && emailVerified ? email.toLowerCase() : undefined,
      role: 'CUSTOMER',
      providers: [{ name: provider, subject, emailVerified }],
    });
  } else if (!user.providers.some((item) => item.name === provider && item.subject === subject)) {
    user.providers.push({ name: provider, subject, emailVerified });
  }
  if (!user.name && name) user.name = name;
  return saveSession(user);
}

module.exports = { login, loginWithProvider, loginWithVerifiedPhone, logout, refresh, register };
