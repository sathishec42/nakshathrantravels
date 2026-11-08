const express = require('express');
const passport = require('passport');
const AppError = require('../lib/AppError');
const authController = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const { createState, stateCookieOptions, validateOAuthState } = require('../middleware/oauthState');
const validate = require('../middleware/validate');
const { enabledProviders, providerStrategies } = require('../config/passport');
const {
  firebaseTokenSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} = require('../validation/schemas');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.currentUser);
router.post('/phone/firebase', validate(firebaseTokenSchema), authController.verifyFirebasePhone);
router.get('/providers', (req, res) => res.json({
  providers: {
    google: enabledProviders.has('google') && Boolean(process.env.OAUTH_STATE_SECRET),
    apple: enabledProviders.has('apple') && Boolean(process.env.OAUTH_STATE_SECRET),
    facebook: enabledProviders.has('facebook') && Boolean(process.env.OAUTH_STATE_SECRET),
    github: enabledProviders.has('github') && Boolean(process.env.OAUTH_STATE_SECRET),
    phone: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON),
    emailPassword: Boolean(
      process.env.JWT_ACCESS_SECRET?.length >= 32
      && process.env.JWT_REFRESH_SECRET?.length >= 32,
    ),
  },
}));

router.get('/oauth/:provider', (req, res, next) => {
  const { provider } = req.params;
  const configuration = providerStrategies[provider];
  if (!configuration) return next(new AppError(404, 'Unsupported OAuth provider.', 'OAUTH_PROVIDER_NOT_SUPPORTED'));
  if (!enabledProviders.has(provider)) {
    return next(new AppError(503, `${provider} OAuth credentials are not configured.`, 'OAUTH_NOT_CONFIGURED'));
  }
  const state = createState();
  res.cookie('oauthState', state, stateCookieOptions(provider));
  const scopes = {
    google: ['profile', 'email'],
    facebook: ['email'],
    github: ['user:email'],
    apple: ['name', 'email'],
  };
  return passport.authenticate(provider, { session: false, state, scope: scopes[provider] })(req, res, next);
});

function completeOAuth(req, res, next) {
  const { provider } = req.params;
  if (!providerStrategies[provider]) {
    return next(new AppError(404, 'Unsupported OAuth provider.', 'OAUTH_PROVIDER_NOT_SUPPORTED'));
  }
  if (!enabledProviders.has(provider)) {
    return next(new AppError(503, `${provider} OAuth credentials are not configured.`, 'OAUTH_NOT_CONFIGURED'));
  }
  return validateOAuthState(req, res, (stateError) => {
    if (stateError) return next(stateError);
    return passport.authenticate(provider, { session: false }, (error, user) => {
      if (error) return next(error);
      if (!user) return next(new AppError(401, 'OAuth authentication failed.', 'OAUTH_FAILED'));
      req.user = user;
      return authController.oauthSuccess(req, res, next);
    })(req, res, next);
  });
}

router.get('/oauth/:provider/callback', completeOAuth);
router.post('/oauth/apple/callback', completeOAuth);

module.exports = router;
