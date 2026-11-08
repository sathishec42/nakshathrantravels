const DEFAULT_BUFFER_HOURS = 12;

function hoursBetween(later, earlier) {
  return (new Date(later).getTime() - new Date(earlier).getTime()) / 3_600_000;
}

function checkTurnaround({ startAt, endAt, existingTrips = [], bufferHours = DEFAULT_BUFFER_HOURS }) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
    throw new TypeError('A valid trip start and an end time after the start are required.');
  }

  const conflicts = existingTrips.flatMap((trip) => {
    const previousStart = new Date(trip.startAt);
    const previousEnd = new Date(trip.actualEndAt || trip.endAt);
    const nextStart = previousStart;
    if (!Number.isFinite(previousEnd.getTime()) || !Number.isFinite(nextStart.getTime())) {
      throw new TypeError('Existing trips must have valid startAt and endAt dates.');
    }

    let relation;
    let gapHours;
    if (previousEnd <= start) {
      relation = 'PREVIOUS_TRIP';
      gapHours = hoursBetween(start, previousEnd);
    } else if (nextStart >= end) {
      relation = 'NEXT_TRIP';
      gapHours = hoursBetween(nextStart, end);
    } else {
      relation = 'OVERLAPPING_TRIP';
      const overlapStart = Math.max(start.getTime(), previousStart.getTime());
      const overlapEnd = Math.min(end.getTime(), previousEnd.getTime());
      gapHours = -Math.max(0, (overlapEnd - overlapStart) / 3_600_000);
    }

    if (gapHours >= bufferHours) return [];
    return [{
      bookingId: String(trip.id || trip._id || ''),
      relation,
      gapHours: Number(gapHours.toFixed(2)),
      requiredHours: bufferHours,
      reason: relation === 'OVERLAPPING_TRIP'
        ? 'The requested trip overlaps an existing assignment.'
        : `Only ${gapHours.toFixed(2)} hours separate these trips; ${bufferHours} hours are required.`,
    }];
  });

  return { available: conflicts.length === 0, bufferHours, conflicts };
}

module.exports = { DEFAULT_BUFFER_HOURS, checkTurnaround };
