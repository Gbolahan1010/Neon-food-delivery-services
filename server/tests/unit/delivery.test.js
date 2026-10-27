const {
  haversineKm,
  feeForDistance,
  BASE_FEE_CENTS,
  PER_KM_CENTS,
  MAX_FEE_CENTS,
} = require('../../src/services/deliveryService');
const { geocode, addressToQuery } = require('../../src/services/geoService');
const {
  mockGeocode,
  mockGeocodeNotFound,
  mockGeocodeDown,
  CAPEL_STREET,
  GRAFTON_STREET,
  CORK,
} = require('../geoMock');

describe('haversine distance', () => {
  it('is zero for the same point', () => {
    expect(haversineKm(CAPEL_STREET, CAPEL_STREET)).toBe(0);
  });

  it('matches known distances', () => {
    expect(haversineKm(CAPEL_STREET, GRAFTON_STREET)).toBeCloseTo(0.96, 1);
    expect(haversineKm(GRAFTON_STREET, CORK)).toBeGreaterThan(215);
    expect(haversineKm(GRAFTON_STREET, CORK)).toBeLessThan(225);
  });
});

describe('delivery fee', () => {
  it('is the base fee plus a charge per km', () => {
    expect(feeForDistance(0)).toBe(BASE_FEE_CENTS);
    expect(feeForDistance(5)).toBe(BASE_FEE_CENTS + 5 * PER_KM_CENTS);
    expect(feeForDistance(2.5)).toBe(BASE_FEE_CENTS + 150);
  });

  it('never goes above the maximum', () => {
    expect(feeForDistance(500)).toBe(MAX_FEE_CENTS);
  });
});

describe('geocoding with OpenStreetMap Nominatim', () => {
  const address = { line1: '1 Grafton Street', city: 'Dublin 2', eircode: 'D02 AB12' };

  it('builds an Ireland-only query from the address', () => {
    expect(addressToQuery(address)).toBe('1 Grafton Street, Dublin 2, D02 AB12, Ireland');
  });

  it('calls Nominatim with a User-Agent and returns numeric coordinates', async () => {
    const fetchSpy = mockGeocode(GRAFTON_STREET);
    const result = await geocode(address);

    expect(result).toMatchObject({ lat: 53.3417, lng: -6.2596 });
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/^https:\/\/nominatim\.openstreetmap\.org\/search\?/);
    expect(url).toMatch(/countrycodes=ie/);
    expect(options.headers['User-Agent']).toMatch(/NeonFoodDelivery/);
  });

  it('caches results so the same address is only looked up once', async () => {
    const fetchSpy = mockGeocode(GRAFTON_STREET);
    await geocode(address);
    await geocode({ ...address, line1: '1 GRAFTON STREET' }); // same address, different case
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('returns 422 when the address does not exist', async () => {
    mockGeocodeNotFound();
    await expect(geocode(address)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('returns 503 when the service is unreachable', async () => {
    mockGeocodeDown();
    await expect(geocode(address)).rejects.toMatchObject({ statusCode: 503 });
  });

  it('returns 503 when the service replies with an error', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response('Too many requests', { status: 429 }));
    await expect(geocode(address)).rejects.toMatchObject({ statusCode: 503 });
  });
});
