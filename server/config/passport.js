const passport = require('passport');
const AppleStrategy = require('passport-apple');
const FacebookStrategy = require('passport-facebook').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const appleSignin = require('apple-signin-auth');
const authService = require('../services/authService');

const enabledProviders = new Set();
const providerStrategies = {
  google: {
    configured: () => Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET),
    callbackURL: () => process.env.GOOGLE_OAUTH_CALLBACK_URL || 'http://localhost:4000/api/auth/oauth/google/callback',
    strategy() {
      return new GoogleStrategy({
        clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        callbackURL: this.callbackURL(),
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          const result = await authService.loginWithProvider('google', profile.id, {
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            emailVerified: profile._json?.email_verified === true,
          });
          return done(null, result);
        } catch (error) {
          return done(error);
        }
      });
    },
  },
  facebook: {
    configured: () => Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
    callbackURL: () => process.env.FACEBOOK_OAUTH_CALLBACK_URL || 'http://localhost:4000/api/auth/oauth/facebook/callback',
    strategy() {
      return new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: this.callbackURL(),
        profileFields: ['id', 'displayName', 'emails'],
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          const result = await authService.loginWithProvider('facebook', profile.id, {
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
          });
          return done(null, result);
        } catch (error) {
          return done(error);
        }
      });
    },
  },
  github: {
    configured: () => Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    callbackURL: () => process.env.GITHUB_OAUTH_CALLBACK_URL || 'http://localhost:4000/api/auth/oauth/github/callback',
    strategy() {
      return new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: this.callbackURL(),
        scope: ['user:email'],
      }, async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.find((item) => item.verified);
          const result = await authService.loginWithProvider('github', profile.id, {
            name: profile.displayName || profile.username,
            email: email?.value,
            emailVerified: Boolean(email),
          });
          return done(null, result);
        } catch (error) {
          return done(error);
        }
      });
    },
  },
  apple: {
    configured: () => Boolean(
      process.env.APPLE_CLIENT_ID
      && process.env.APPLE_TEAM_ID
      && process.env.APPLE_KEY_ID
      && process.env.APPLE_PRIVATE_KEY,
    ),
    callbackURL: () => process.env.APPLE_OAUTH_CALLBACK_URL || 'http://localhost:4000/api/auth/oauth/apple/callback',
    strategy() {
      return new AppleStrategy({
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyString: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        callbackURL: this.callbackURL(),
        scope: ['name', 'email'],
        passReqToCallback: true,
      }, async (req, accessToken, refreshToken, idToken, profile, done) => {
        try {
          const identity = await appleSignin.verifyIdToken(idToken, {
            audience: process.env.APPLE_CLIENT_ID,
            issuer: 'https://appleid.apple.com',
          });
          const submittedUser = req.appleProfile;
          const name = submittedUser?.name
            ? [submittedUser.name.firstName, submittedUser.name.lastName].filter(Boolean).join(' ')
            : undefined;
          const result = await authService.loginWithProvider('apple', identity.sub, {
            name,
            email: identity.email,
            emailVerified: identity.email_verified === 'true' || identity.email_verified === true,
          });
          return done(null, result);
        } catch (error) {
          return done(error);
        }
      });
    },
  },
};

function configurePassport() {
  for (const [provider, configuration] of Object.entries(providerStrategies)) {
    if (!configuration.configured()) continue;
    passport.use(provider, configuration.strategy());
    enabledProviders.add(provider);
  }
  return { enabledProviders, providerStrategies };
}

module.exports = { configurePassport, enabledProviders, providerStrategies };
