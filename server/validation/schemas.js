const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'A valid resource ID is required.');
const secureUrl = z.string().url().refine((value) => value.startsWith('https://'), 'Document URLs must use HTTPS.');
const stateCode = z.enum(['IN-KA', 'IN-TN', 'IN-KL', 'IN-AP', 'IN-TG', 'IN-TS', 'IN-PY', 'IN-GA']);

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.email(),
  password: z.string().min(12).max(128),
  phone: z.string().trim().min(8).max(20).optional(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({ refreshToken: z.string().min(1).optional() }).default({});
const firebaseTokenSchema = z.object({ idToken: z.string().min(1) });
const roleUpdateSchema = z.object({
  role: z.enum(['CUSTOMER', 'DRIVER', 'FLEET_OWNER', 'ADMIN', 'SUPERADMIN']),
  reason: z.string().trim().min(3).max(1000),
});

const vehicleSchema = z.object({
  type: z.enum([
    'HATCHBACK', 'SEDAN', 'SUV', 'INNOVA_CRYSTA',
    'TEMPO_TRAVELLER', 'TEMPO_TRAVELLER_12', 'TEMPO_TRAVELLER_16',
    'TEMPO_TRAVELLER_20', 'MINI_BUS', 'LUXURY_COACH',
  ]),
  modelName: z.string().trim().min(2).max(120).optional(),
  registrationNumber: z.string().trim().min(4).max(20)
    .regex(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/i, 'Enter a valid Indian vehicle registration number.'),
  chassisNumber: z.string().trim().min(4).max(80),
  engineNumber: z.string().trim().min(2).max(80),
  rcNumber: z.string().trim().min(1).max(40),
  seats: z.number().int().min(1).max(100),
  luggageBagLimit: z.number().int().min(0).optional(),
  airConditioned: z.boolean(),
  luggageCapacityLitres: z.number().min(0).optional(),
  rcDocumentUrl: secureUrl,
  insurancePolicyNumber: z.string().trim().min(1).max(80),
  insuranceDocumentUrl: secureUrl,
  insuranceExpiryDate: z.coerce.date(),
  fitnessCertificateUrl: secureUrl,
  fitnessExpiryDate: z.coerce.date(),
  pollutionCertificateUrl: secureUrl,
  pollutionExpiryDate: z.coerce.date(),
  photoUrls: z.array(secureUrl).min(1).max(20),
  pricing: z.object({
    baseFare: z.number().min(0).optional(),
    ratePerKm: z.number().min(0).optional(),
    driverBataDay: z.number().min(0).optional(),
    driverBataNight: z.number().min(0).optional(),
  }).optional(),
});

const driverSchema = z.object({
  userId: objectId,
  drivingLicenseNumber: z.string().trim().min(4).max(40),
  drivingLicenseBadgeNumber: z.string().trim().min(1).max(40),
  drivingLicenseExpiry: z.coerce.date().refine((value) => value > new Date(), 'Driving license must not be expired.'),
  licenseDocumentUrl: secureUrl,
  policeVerificationDocumentUrl: secureUrl,
  aadhaarVerificationDocumentUrl: secureUrl,
  emergencyContactName: z.string().trim().min(2).max(120),
  emergencyContactPhone: z.string().trim().min(8).max(20),
  assignedVehicle: objectId.optional(),
});

const permitSchema = z.object({
  vehicle: objectId,
  permitNumber: z.string().trim().min(2).max(80),
  permitType: z.enum(['STATE_SPECIFIC', 'ALL_INDIA_TOURIST']).optional(),
  issuedState: z.union([stateCode, z.literal('AITP')]).optional(),
  authorizedStates: z.array(z.union([stateCode, z.literal('AITP')])).max(9).optional(),
  jurisdiction: z.union([stateCode, z.literal('AITP')]).optional(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  documentUrl: secureUrl,
}).refine((value) => value.validTo >= value.validFrom, {
  path: ['validTo'],
  message: 'validTo must be on or after validFrom.',
}).refine((value) => value.issuedState || value.jurisdiction, {
  path: ['issuedState'],
  message: 'An issuing state or legacy jurisdiction is required.',
});

const bookingSchema = z.object({
  vehicleId: objectId.optional(),
  pickup: z.string().trim().min(2).max(300),
  dropoff: z.string().trim().min(2).max(300),
  waypoints: z.array(z.string().trim().min(2).max(300)).max(23).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  passengers: z.number().int().min(1).max(100),
}).refine((value) => value.endAt > value.startAt, {
  path: ['endAt'],
  message: 'Trip end must be after trip start.',
}).refine((value) => value.startAt > new Date(), {
  path: ['startAt'],
  message: 'Trip start must be in the future.',
});

const reviewSchema = z.object({
  status: z.string(),
  reason: z.string().trim().min(3).max(1000),
});

const quoteOverrideSchema = z.object({
  baseFare: z.number().min(0).optional(),
  ratePerKm: z.number().min(0).optional(),
  driverBata: z.number().min(0).optional(),
  estimatedTolls: z.number().min(0).optional(),
  borderTaxes: z.number().min(0).optional(),
  surcharges: z.number().min(0).optional(),
  waivedFees: z.number().min(0).optional(),
  reason: z.string().trim().min(3).max(1000),
});

const assignmentSchema = z.object({
  vehicleId: objectId,
  driverId: objectId,
});

const vehicleSearchSchema = z.object({
  type: z.enum([
    'HATCHBACK', 'SEDAN', 'SUV', 'INNOVA_CRYSTA',
    'TEMPO_TRAVELLER', 'TEMPO_TRAVELLER_12', 'TEMPO_TRAVELLER_16',
    'TEMPO_TRAVELLER_20', 'MINI_BUS', 'LUXURY_COACH',
  ]).optional(),
  minSeats: z.coerce.number().int().min(1).max(100).optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
}).refine((value) => Boolean(value.startAt) === Boolean(value.endAt), {
  path: ['endAt'],
  message: 'Both startAt and endAt are required for an availability search.',
}).refine((value) => !value.startAt || value.endAt > value.startAt, {
  path: ['endAt'],
  message: 'Trip end must be after trip start.',
}).refine((value) => !value.startAt || value.startAt > new Date(), {
  path: ['startAt'],
  message: 'Trip start must be in the future.',
});

module.exports = {
  assignmentSchema,
  bookingSchema,
  driverSchema,
  firebaseTokenSchema,
  loginSchema,
  objectId,
  permitSchema,
  quoteOverrideSchema,
  refreshSchema,
  registerSchema,
  roleUpdateSchema,
  reviewSchema,
  vehicleSearchSchema,
  vehicleSchema,
};
