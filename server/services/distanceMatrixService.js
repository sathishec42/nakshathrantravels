const { Client } = require('@googlemaps/google-maps-services-js');
const AppError = require('../lib/AppError');

const STATE_CODES = new Map([
  ['andaman and nicobar islands', 'IN-AN'],
  ['andhra pradesh', 'IN-AP'],
  ['arunachal pradesh', 'IN-AR'],
  ['assam', 'IN-AS'],
  ['bihar', 'IN-BR'],
  ['chandigarh', 'IN-CH'],
  ['chhattisgarh', 'IN-CT'],
  ['dadra and nagar haveli and daman and diu', 'IN-DH'],
  ['delhi', 'IN-DL'],
  ['goa', 'IN-GA'],
  ['gujarat', 'IN-GJ'],
  ['haryana', 'IN-HR'],
  ['himachal pradesh', 'IN-HP'],
  ['jammu and kashmir', 'IN-JK'],
  ['jharkhand', 'IN-JH'],
  ['karnataka', 'IN-KA'],
  ['kerala', 'IN-KL'],
  ['ladakh', 'IN-LA'],
  ['lakshadweep', 'IN-LD'],
  ['madhya pradesh', 'IN-MP'],
  ['maharashtra', 'IN-MH'],
  ['manipur', 'IN-MN'],
  ['meghalaya', 'IN-ML'],
  ['mizoram', 'IN-MZ'],
  ['nagaland', 'IN-NL'],
  ['odisha', 'IN-OD'],
  ['puducherry', 'IN-PY'],
  ['punjab', 'IN-PB'],
  ['rajasthan', 'IN-RJ'],
  ['sikkim', 'IN-SK'],
  ['tamil nadu', 'IN-TN'],
  ['telangana', 'IN-TG'],
  ['tripura', 'IN-TR'],
  ['uttar pradesh', 'IN-UP'],
  ['uttarakhand', 'IN-UK'],
  ['west bengal', 'IN-WB'],
]);

const googleMaps = new Client({});

function getApiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new AppError(503, 'Google Maps is not configured.', 'MAPS_NOT_CONFIGURED');
  return key;
}

function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: latitude / 1e5, lng: longitude / 1e5 });
  }
  return points;
}

function haversineMeters(a, b) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(b.lat - a.lat);
  const longitudeDelta = radians(b.lng - a.lng);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function sampleRoute(points, intervalMeters) {
  if (!Number.isFinite(intervalMeters) || intervalMeters <= 0) {
    throw new TypeError('intervalMeters must be a positive finite number.');
  }
  if (!points.length) return [];
  const samples = [points[0]];
  let distanceSinceSample = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentLength = haversineMeters(previous, current);
    let distanceAlongSegment = 0;
    let distanceToSample = intervalMeters - distanceSinceSample;
    while (segmentLength - distanceAlongSegment >= distanceToSample) {
      distanceAlongSegment += distanceToSample;
      const fraction = distanceAlongSegment / segmentLength;
      samples.push({
        lat: previous.lat + (current.lat - previous.lat) * fraction,
        lng: previous.lng + (current.lng - previous.lng) * fraction,
      });
      distanceSinceSample = 0;
      distanceToSample = intervalMeters;
    }
    distanceSinceSample += segmentLength - distanceAlongSegment;
  }
  const finalPoint = points[points.length - 1];
  if (samples[samples.length - 1] !== finalPoint) samples.push(finalPoint);
  return samples;
}

function detectGhatRoute(elevationSamples) {
  const elevations = elevationSamples.map((sample) => sample.elevation).filter(Number.isFinite);
  if (elevations.length < 2) return false;
  let totalAscent = 0;
  let steepSegment = false;
  for (let index = 1; index < elevations.length; index += 1) {
    const climb = elevations[index] - elevations[index - 1];
    if (climb > 0) totalAscent += climb;
    if (climb >= 300) steepSegment = true;
  }
  return steepSegment || totalAscent >= 700;
}

async function getRouteWarnings(route, routePoints, key) {
  const warnings = (route.warnings || []).map((text) => ({
    code: /toll/i.test(text) ? 'TOLL_ROUTE_REVIEW' : 'DIRECTIONS_WARNING',
    text,
  }));
  const samples = sampleRoute(routePoints, 10_000).slice(0, 100);
  if (samples.length < 2) return warnings;
  const response = await googleMaps.elevation({
    params: { locations: samples, key },
  });
  if (response.data.status !== 'OK') {
    throw new AppError(502, `Google Elevation lookup failed: ${response.data.status}.`, 'ELEVATION_LOOKUP_FAILED');
  }
  if (detectGhatRoute(response.data.results)) {
    warnings.push({
      code: 'GHAT_ROAD_REVIEW',
      text: 'Elevation changes suggest a hill or ghat-road segment; review vehicle suitability and any applicable surcharge.',
    });
  }
  return warnings;
}

async function getJurisdictions(routePoints, key) {
  const configuredInterval = Number(process.env.ROUTE_STATE_SAMPLE_METERS || 20_000);
  if (!Number.isFinite(configuredInterval) || configuredInterval < 1_000) {
    throw new AppError(500, 'ROUTE_STATE_SAMPLE_METERS must be at least 1000.', 'INVALID_MAPS_CONFIG');
  }
  const samples = sampleRoute(routePoints, configuredInterval);
  const jurisdictions = new Set();
  for (let index = 0; index < samples.length; index += 5) {
    const batch = samples.slice(index, index + 5);
    const results = await Promise.all(batch.map(async (location) => {
      const response = await googleMaps.reverseGeocode({
        params: {
          latlng: location,
          result_type: ['administrative_area_level_1'],
          region: 'in',
          key,
        },
      });
      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new AppError(502, `Google reverse geocoding failed: ${response.data.status}.`, 'MAPS_LOOKUP_FAILED');
      }
      if (response.data.status === 'ZERO_RESULTS') {
        throw new AppError(422, 'Unable to identify a state along the proposed route.', 'ROUTE_STATE_UNRESOLVED');
      }
      const component = response.data.results
        .flatMap((result) => result.address_components)
        .find((item) => item.types.includes('administrative_area_level_1'));
      const stateCode = component && STATE_CODES.get(component.long_name.toLowerCase());
      if (!stateCode) {
        throw new AppError(422, 'Google Maps returned an unsupported state along the route.', 'ROUTE_STATE_UNRESOLVED');
      }
      jurisdictions.add(stateCode);
    }));
    await Promise.all(results);
  }
  return [...jurisdictions];
}

async function getDirections({ origin, destination, waypoints = [] }) {
  const key = getApiKey();
  const response = await googleMaps.directions({
    params: {
      origin,
      destination,
      waypoints,
      mode: 'driving',
      region: 'in',
      key,
    },
  });
  if (response.data.status !== 'OK' || !response.data.routes.length) {
    throw new AppError(422, `Google Directions could not find a route: ${response.data.status}.`, 'ROUTE_NOT_FOUND');
  }
  const route = response.data.routes[0];
  const routePoints = decodePolyline(route.overview_polyline.points);
  const legs = route.legs;
  const [jurisdictionCodes, warnings] = await Promise.all([
    getJurisdictions(routePoints, key),
    getRouteWarnings(route, routePoints, key),
  ]);
  return {
    distanceMeters: legs.reduce((sum, leg) => sum + leg.distance.value, 0),
    durationSeconds: legs.reduce((sum, leg) => sum + leg.duration.value, 0),
    encodedPolyline: route.overview_polyline.points,
    jurisdictionCodes,
    warnings,
    legs: legs.map((leg) => ({
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      distanceMeters: leg.distance.value,
      durationSeconds: leg.duration.value,
    })),
  };
}

async function getDistanceMatrix({ locations, departureTime }) {
  if (!Array.isArray(locations) || locations.length < 2) {
    throw new TypeError('At least two locations are required for a distance matrix.');
  }
  if (locations.length > 25) throw new TypeError('Distance matrix supports at most 25 trip stops.');
  const key = getApiKey();
  const departure = departureTime ? new Date(departureTime) : null;
  if (departure && !Number.isFinite(departure.getTime())) {
    throw new TypeError('departureTime must be a valid date.');
  }
  const elements = [];
  for (let offset = 0; offset < locations.length - 1; offset += 10) {
    const origins = locations.slice(offset, offset + 10);
    const destinations = locations.slice(offset + 1, offset + 11);
    const response = await googleMaps.distancematrix({
      params: {
        origins,
        destinations,
        mode: 'driving',
        region: 'in',
        ...(departure ? {
          departure_time: departure,
          traffic_model: 'best_guess',
        } : {}),
        key,
      },
    });
    if (response.data.status !== 'OK') {
      throw new AppError(502, `Google Distance Matrix failed: ${response.data.status}.`, 'DISTANCE_MATRIX_FAILED');
    }
    for (const element of getConsecutiveMatrixElements(response.data.rows, origins.length)) {
      if (!element || element.status !== 'OK') {
        throw new AppError(422, `Google Distance Matrix could not resolve a trip leg: ${element?.status || 'UNKNOWN_ERROR'}.`, 'DISTANCE_MATRIX_FAILED');
      }
      elements.push(element);
    }
  }
  return {
    distanceMeters: elements.reduce((sum, element) => sum + element.distance.value, 0),
    durationSeconds: elements.reduce(
      (sum, element) => sum + (element.duration_in_traffic?.value || element.duration.value),
      0,
    ),
    legs: elements.map((element) => ({
      distanceMeters: element.distance.value,
      durationSeconds: element.duration_in_traffic?.value || element.duration.value,
      staticDurationSeconds: element.duration.value,
    })),
  };
}

async function getPlaceSuggestions({ input, sessionToken }) {
  const key = getApiKey();
  const response = await googleMaps.placeAutocomplete({
    params: {
      input,
      components: ['country:in'],
      types: 'geocode',
      ...(sessionToken ? { sessiontoken: sessionToken } : {}),
      key,
    },
  });
  if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
    throw new AppError(502, `Google Places Autocomplete failed: ${response.data.status}.`, 'PLACES_LOOKUP_FAILED');
  }
  return response.data.predictions.map((prediction) => ({
    placeId: prediction.place_id,
    description: prediction.description,
    mainText: prediction.structured_formatting.main_text,
    secondaryText: prediction.structured_formatting.secondary_text,
  }));
}

function getConsecutiveMatrixElements(rows, expectedCount) {
  return Array.from({ length: expectedCount }, (_, index) => rows[index]?.elements[index]);
}

module.exports = {
  decodePolyline,
  detectGhatRoute,
  getConsecutiveMatrixElements,
  getDirections,
  getDistanceMatrix,
  getPlaceSuggestions,
  sampleRoute,
};
