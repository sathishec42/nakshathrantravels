export function getEnv(key, fallback = '') {
  const value = process.env[key];
  return value ?? fallback;
}

export function validateEnv() {
  const required = ['MONGODB_URI', 'NEXT_PUBLIC_APP_URL', 'AUTH_SECRET'];
  const missing = required.filter((key) => !getEnv(key, '').trim());

  return {
    ok: missing.length === 0,
    missing,
    values: {
      MONGODB_URI: getEnv('MONGODB_URI', 'mongodb://dummy-user:dummy-password@localhost:27017/nakshathrantravels'),
      NEXT_PUBLIC_APP_URL: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
      AUTH_SECRET: getEnv('AUTH_SECRET', 'dummy-auth-secret'),
      PRICE_PER_KM_INR: getEnv('PRICE_PER_KM_INR', '15'),
    },
  };
}
