const GeocodeCache = require('../models/GeocodeCache');
const AppError = require('../utils/AppError');
const { geocoderUserAgent } = require('../config/env');

/**
 * Address lookup (geocoding) with OpenStreetMap Nominatim, a free public web service.
 * Turns "12 Capel Street, Dublin 1" into latitude/longitude so we can work out delivery distance.
 * Docs and usage policy: https://nominatim.org/release-docs/latest/api/Search/
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const TIMEOUT_MS = 5000;

function addressToQuery({ line1, line2, city, eircode } = {}) {
  return [line1, line2, city, eircode, 'Ireland']
    .filter(Boolean)
    .map((part) => String(part).trim())
    .join(', ');
}

async function callNominatim(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'ie',
  });

  let response;
  try {
    response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': geocoderUserAgent, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(TIMEOUT_MS), // never wait more than 5 seconds
    });
  } catch {
    throw new AppError(
      'The address lookup service is not responding. Please try again shortly.',
      503
    );
  }
  if (!response.ok) {
    throw new AppError('The address lookup service is unavailable. Please try again shortly.', 503);
  }

  let results;
  try {
    results = await response.json();
  } catch {
    throw new AppError('The address lookup service sent an unexpected reply.', 502);
  }
  return results;
}

/**
 * Returns { lat, lng, displayName } for an address, from the cache when possible.
 * Throws 422 when the address cannot be found and 503 when the service is down.
 */
async function geocode(address) {
  const query = addressToQuery(address);
  const key = query.toLowerCase();

  const cached = await GeocodeCache.findOne({ query: key }).lean();
  if (cached) return { lat: cached.lat, lng: cached.lng, displayName: cached.displayName };

  const results = await callNominatim(query);
  if (!Array.isArray(results) || results.length === 0) {
    throw new AppError(
      'We could not find that address. Check the street and city, or add an Eircode.',
      422
    );
  }

  // Nominatim returns coordinates as strings: convert and check them before trusting them.
  const lat = Number(results[0].lat);
  const lng = Number(results[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new AppError('The address lookup service sent an unexpected reply.', 502);
  }

  const location = { lat, lng, displayName: results[0].display_name };
  await GeocodeCache.updateOne({ query: key }, { $set: location }, { upsert: true });
  return location;
}

module.exports = { geocode, addressToQuery };
