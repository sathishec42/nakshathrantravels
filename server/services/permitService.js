const SUPPORTED_JURISDICTIONS = ['IN-KA', 'IN-TN', 'IN-KL', 'IN-AP', 'IN-TG', 'IN-TS', 'IN-PY', 'IN-GA'];

function isActivePermit(permit) {
  return permit.status === 'VALID' || permit.status === 'ACTIVE';
}

function coversState(permit, state) {
  if (permit.permitType === 'ALL_INDIA_TOURIST'
    || permit.jurisdiction === 'AITP'
    || permit.issuedState === 'AITP'
    || permit.authorizedStates?.includes('AITP')) return true;
  return permit.authorizedStates?.includes(state)
    || permit.jurisdiction === state
    || permit.issuedState === state;
}

function evaluatePermits({
  traversedStates,
  permits = [],
  tripDate = new Date(),
  tripEnd = tripDate,
  taxEstimates = {},
  expiryWarningDays = 30,
}) {
  const start = new Date(tripDate);
  const end = new Date(tripEnd);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
    throw new TypeError('tripDate and tripEnd must be valid, ordered dates.');
  }
  const states = [...new Set(traversedStates || [])];
  const invalidStates = states.filter((state) => !/^IN-[A-Z]{2}$/.test(state));
  if (invalidStates.length) {
    throw new TypeError(`Invalid jurisdiction code(s): ${invalidStates.join(', ')}.`);
  }

  const validOnDate = (permit) => isActivePermit(permit)
    && new Date(permit.validFrom) <= start
    && new Date(permit.validTo) >= end;
  const activePermits = permits.filter(validOnDate);
  const warningBoundary = new Date(end.getTime() + expiryWarningDays * 86_400_000);
  const hasAitp = activePermits.some((permit) => (
    permit.permitType === 'ALL_INDIA_TOURIST'
    || permit.jurisdiction === 'AITP'
    || permit.issuedState === 'AITP'
    || permit.authorizedStates?.includes('AITP')
  ));
  const aitpNearExpiry = activePermits.some((permit) => (
    (permit.permitType === 'ALL_INDIA_TOURIST'
      || permit.jurisdiction === 'AITP'
      || permit.issuedState === 'AITP'
      || permit.authorizedStates?.includes('AITP'))
    && new Date(permit.validTo) <= warningBoundary
  ));
  const missingStates = hasAitp
    ? []
    : states.filter((state) => !activePermits.some((permit) => coversState(permit, state)));
  const nearExpiryStates = states.filter((state) => (
    (hasAitp && aitpNearExpiry) || (!hasAitp && activePermits.some((permit) => (
      coversState(permit, state) && new Date(permit.validTo) <= warningBoundary
    )))
  ));
  const taxRequiredStates = [...new Set([...missingStates, ...nearExpiryStates])];
  const estimatedAmounts = taxRequiredStates.map((state) => {
    const amount = taxEstimates[state];
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  });
  const estimateComplete = estimatedAmounts.every((amount) => amount !== null);
  const estimatedBorderTax = estimateComplete
    ? estimatedAmounts.reduce((sum, amount) => sum + amount, 0)
    : null;

  return {
    compliant: missingStates.length === 0,
    flags: taxRequiredStates.length ? ['BORDER_PERMIT_REQUIRED', 'PERMIT_TAX_REQUIRED'] : [],
    missingStates,
    nearExpiryStates,
    taxRequiredStates,
    estimatedBorderTax,
    estimateComplete,
    message: missingStates.length
      ? 'A valid permit or configured tax estimate is required for each traversed state.'
      : nearExpiryStates.length
        ? 'Permit coverage is nearing expiry; review the configured border-tax estimate before dispatch.'
        : 'Active permits cover all traversed states.',
  };
}

function expirePermits(permits, now = new Date()) {
  return permits.map((permit) => {
    if (isActivePermit(permit) && new Date(permit.validTo) < now) {
      return { ...permit, status: 'EXPIRED' };
    }
    return permit;
  });
}

module.exports = { SUPPORTED_JURISDICTIONS, evaluatePermits, expirePermits };
