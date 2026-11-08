const mongoose = require('mongoose');
const { VALID_PERMIT_JURISDICTIONS } = require('../constants/regions');

const permitSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
  permitNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  permitType: { type: String, enum: ['STATE_SPECIFIC', 'ALL_INDIA_TOURIST'], default: 'STATE_SPECIFIC', index: true },
  issuedState: { type: String, enum: VALID_PERMIT_JURISDICTIONS },
  authorizedStates: { type: [{ type: String, enum: VALID_PERMIT_JURISDICTIONS }], default: [] },
  jurisdiction: {
    type: String,
    enum: VALID_PERMIT_JURISDICTIONS,
  },
  validFrom: { type: Date, required: true },
  validTo: {
    type: Date,
    required: true,
    validate: {
      validator(value) { return !this.validFrom || value >= this.validFrom; },
      message: 'validTo must be on or after validFrom.',
    },
  },
  documentUrl: { type: String, required: true },
  status: { type: String, enum: ['PENDING_VERIFICATION', 'VALID', 'ACTIVE', 'EXPIRED', 'PENDING_RENEWAL', 'REJECTED', 'SUSPENDED'], default: 'PENDING_VERIFICATION', index: true },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
}, { timestamps: true });

permitSchema.pre('validate', function normalizePermit() {
  if (!this.jurisdiction) this.jurisdiction = this.issuedState;
  if (!this.issuedState) this.issuedState = this.jurisdiction;
  if (this.jurisdiction === 'AITP') this.permitType = 'ALL_INDIA_TOURIST';
  if (this.permitType === 'ALL_INDIA_TOURIST') {
    this.authorizedStates = ['AITP'];
  } else if (this.jurisdiction && !this.authorizedStates.includes(this.jurisdiction)) {
    this.authorizedStates.push(this.jurisdiction);
  }
  if (!this.jurisdiction && !this.issuedState) {
    this.invalidate('issuedState', 'A permit issuing state is required.');
  }
});

permitSchema.index({ vehicle: 1, jurisdiction: 1, status: 1, validFrom: 1, validTo: 1 });
permitSchema.index({ vehicle: 1, status: 1, validTo: 1, authorizedStates: 1 });

permitSchema.methods.coversStates = function coversStates(requiredStates = []) {
  if (this.permitType === 'ALL_INDIA_TOURIST' || this.authorizedStates.includes('AITP')) return true;
  return requiredStates.every((state) => this.authorizedStates.includes(state));
};

module.exports = mongoose.models.Permit || mongoose.model('Permit', permitSchema);
