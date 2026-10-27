// Fake replies from OpenStreetMap Nominatim, so tests never call the real web service.
// tests/setup.js makes every address resolve to Grafton Street by default.

const GRAFTON_STREET = { lat: 53.3417, lng: -6.2596 };
const CAPEL_STREET = { lat: 53.3478, lng: -6.2701 };
const CORK = { lat: 51.8985, lng: -8.4756 };

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Every address lookup returns this point. */
function mockGeocode(point) {
  return jest.spyOn(global, 'fetch').mockImplementation(async () =>
    reply([
      {
        lat: String(point.lat),
        lon: String(point.lng),
        display_name: 'Test address, Dublin, Ireland',
      },
    ])
  );
}

/** The address does not exist (Nominatim replies with an empty list). */
function mockGeocodeNotFound() {
  return jest.spyOn(global, 'fetch').mockImplementation(async () => reply([]));
}

/** The service is down or unreachable. */
function mockGeocodeDown() {
  return jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
}

module.exports = {
  GRAFTON_STREET,
  CAPEL_STREET,
  CORK,
  mockGeocode,
  mockGeocodeNotFound,
  mockGeocodeDown,
};
