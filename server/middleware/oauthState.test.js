const assert = require('node:assert/strict');
const test = require('node:test');
const { createState, validateOAuthState } = require('./oauthState');

test('accepts a signed OAuth state only when query and cookie match', () => {
  const originalSecret = process.env.OAUTH_STATE_SECRET;
  process.env.OAUTH_STATE_SECRET = 'test-oauth-state-secret-with-at-least-32-characters';
  try {
    const state = createState();
    const req = { query: { state }, cookies: { oauthState: state } };
    const res = { clearCookie() {} };
    let error;
    validateOAuthState(req, res, (nextError) => { error = nextError; });
    assert.equal(error, undefined);

    validateOAuthState(
      { query: { state: `${state}tampered` }, cookies: { oauthState: state } },
      res,
      (nextError) => { error = nextError; },
    );
    assert.equal(error.code, 'INVALID_OAUTH_STATE');
  } finally {
    if (originalSecret === undefined) delete process.env.OAUTH_STATE_SECRET;
    else process.env.OAUTH_STATE_SECRET = originalSecret;
  }
});
