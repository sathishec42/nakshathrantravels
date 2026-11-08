const assert = require('node:assert/strict');
const test = require('node:test');
const {
  driverSchema,
  permitSchema,
  registerSchema,
  vehicleSearchSchema,
  vehicleSchema,
} = require('./schemas');

test('public registration cannot assign a privileged role', () => {
  const parsed = registerSchema.parse({
    name: 'Customer',
    email: 'customer@example.com',
    password: 'a-strong-password',
    role: 'SUPERADMIN',
  });
  assert.equal(Object.hasOwn(parsed, 'role'), false);
});

test('vehicle onboarding requires an HTTPS registration document and at least one photo', () => {
  const base = {
    type: 'SUV',
    registrationNumber: 'KA01AB1234',
    chassisNumber: 'CHASSIS1234',
    engineNumber: 'ENGINE1234',
    rcNumber: 'RC-12345',
    seats: 7,
    airConditioned: true,
    rcDocumentUrl: 'https://storage.example/rc.pdf',
    insurancePolicyNumber: 'POLICY-123',
    insuranceDocumentUrl: 'https://storage.example/insurance.pdf',
    insuranceExpiryDate: new Date('2027-01-01'),
    fitnessCertificateUrl: 'https://storage.example/fitness.pdf',
    fitnessExpiryDate: new Date('2027-01-01'),
    pollutionCertificateUrl: 'https://storage.example/puc.pdf',
    pollutionExpiryDate: new Date('2027-01-01'),
    photoUrls: ['https://storage.example/vehicle.jpg'],
  };
  assert.equal(vehicleSchema.safeParse(base).success, true);
  assert.equal(vehicleSchema.safeParse({ ...base, rcDocumentUrl: 'http://storage.example/rc.pdf' }).success, false);
  assert.equal(vehicleSchema.safeParse({ ...base, photoUrls: [] }).success, false);
});

test('driver onboarding requires license and verification documents', () => {
  const result = driverSchema.safeParse({
    userId: '0123456789abcdef01234567',
    drivingLicenseNumber: 'KA0120261234567',
    drivingLicenseBadgeNumber: 'BADGE-123',
    drivingLicenseExpiry: new Date(Date.now() + 86_400_000),
    licenseDocumentUrl: 'https://storage.example/license.pdf',
    policeVerificationDocumentUrl: 'https://storage.example/police.pdf',
    aadhaarVerificationDocumentUrl: 'https://storage.example/aadhaar.pdf',
    emergencyContactName: 'Emergency Contact',
    emergencyContactPhone: '+919876543210',
  });
  assert.equal(result.success, true);
});

test('permit onboarding accepts AITP and date-bounded state authorization', () => {
  const result = permitSchema.safeParse({
    vehicle: '0123456789abcdef01234567',
    permitNumber: 'AITP-2026-001',
    permitType: 'ALL_INDIA_TOURIST',
    issuedState: 'IN-KA',
    authorizedStates: ['AITP'],
    validFrom: '2026-01-01',
    validTo: '2027-01-01',
    documentUrl: 'https://storage.example/permit.pdf',
  });
  assert.equal(result.success, true);
});

test('vehicle availability search requires a valid future window', () => {
  const now = Date.now();
  assert.equal(vehicleSearchSchema.safeParse({
    minSeats: '12',
    startAt: new Date(now + 86_400_000).toISOString(),
    endAt: new Date(now + 172_800_000).toISOString(),
  }).success, true);
  assert.equal(vehicleSearchSchema.safeParse({ startAt: new Date(now + 86_400_000).toISOString() }).success, false);
  assert.equal(vehicleSearchSchema.safeParse({
    startAt: new Date(now + 172_800_000).toISOString(),
    endAt: new Date(now + 86_400_000).toISOString(),
  }).success, false);
});
