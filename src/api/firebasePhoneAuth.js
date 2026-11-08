import { getApps, initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import apiClient from './client';

function firebaseAuth() {
  const config = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
  };
  const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new Error(`Firebase phone authentication is missing configuration: ${missing.join(', ')}`);
  }
  const app = getApps()[0] || initializeApp(config);
  return getAuth(app);
}

export async function startPhoneVerification(phone, recaptchaContainerId) {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    throw new Error('Enter a phone number in international format, for example +919876543210.');
  }
  const auth = firebaseAuth();
  const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
  try {
    const confirmation = await signInWithPhoneNumber(auth, phone, verifier);
    return {
      async confirm(code) {
        const credential = await confirmation.confirm(code);
        const idToken = await credential.user.getIdToken();
        return apiClient.post('/auth/phone/firebase', { idToken });
      },
      dispose() {
        verifier.clear();
      },
    };
  } catch (error) {
    verifier.clear();
    throw error;
  }
}

export function startOAuthSignIn(provider) {
  const supported = new Set(['google', 'apple', 'facebook', 'github']);
  if (!supported.has(provider)) throw new Error(`Unsupported OAuth provider: ${provider}`);
  window.location.assign(`/api/auth/oauth/${provider}`);
}
