import React, { useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField } from '@mui/material';
import { ArrowRight, Phone } from 'lucide-react';
import { startPhoneVerification } from '../api/firebasePhoneAuth';

export default function PhoneOtpForm({ onAuthenticated }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [verification, setVerification] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => verification?.dispose(), [verification]);

  const sendCode = async () => {
    setBusy(true);
    setError('');
    try {
      const flow = await startPhoneVerification(phone, 'phone-otp-recaptcha');
      setVerification(flow);
    } catch (requestError) {
      setError(requestError.message || 'Could not send a verification code.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    if (!verification) return;
    setBusy(true);
    setError('');
    try {
      const response = await verification.confirm(code);
      onAuthenticated?.(response.data);
      setVerification(null);
    } catch (verificationError) {
      setError(verificationError.response?.data?.error?.message || verificationError.message || 'Phone verification failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack component="form" spacing={2} onSubmit={verifyCode}>
      {error && <Alert severity="error">{error}</Alert>}
      {!verification ? (
        <>
          <TextField
            label="Mobile number"
            type="tel"
            autoComplete="tel"
            placeholder="+919876543210"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
            fullWidth
          />
          <div id="phone-otp-recaptcha" />
          <Button type="button" onClick={sendCode} disabled={busy} variant="contained" startIcon={<Phone size={17} />}>
            Send verification code
          </Button>
        </>
      ) : (
        <>
          <TextField
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            fullWidth
          />
          <Button type="submit" disabled={busy} variant="contained" endIcon={<ArrowRight size={17} />}>
            Verify phone
          </Button>
        </>
      )}
    </Stack>
  );
}
