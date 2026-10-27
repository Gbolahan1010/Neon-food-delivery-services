const request = require('supertest');
const app = require('../src/app');
const Restaurant = require('../src/models/Restaurant');
const { feeForDistance } = require('../src/services/deliveryService');
const { createUser, createRestaurant } = require('./helpers');
const { mockGeocode, CORK } = require('./geoMock');

describe('POST /api/delivery/quote', () => {
  let cookie;
  let restaurant;
  const address = { line1: '1 Grafton Street', city: 'Dublin 2' };

  beforeEach(async () => {
    ({ cookie } = await createUser('customer'));
    const { user: owner } = await createUser('owner');
    restaurant = await createRestaurant(owner);
  });

  const quote = (body) => request(app).post('/api/delivery/quote').set('Cookie', cookie).send(body);

  it('returns the distance and delivery fee for an address', async () => {
    const res = await quote({ restaurantId: restaurant._id, address });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ withinRange: true, maxDistanceKm: 8 });
    expect(res.body.data.deliveryFeeCents).toBe(feeForDistance(res.body.data.distanceKm));
  });

  it('flags addresses outside the delivery radius', async () => {
    mockGeocode(CORK);
    const res = await quote({ restaurantId: restaurant._id, address });
    expect(res.status).toBe(200);
    expect(res.body.data.withinRange).toBe(false);
  });

  it('looks up and saves the restaurant location if it was never set', async () => {
    restaurant.set({ 'address.lat': undefined, 'address.lng': undefined });
    await restaurant.save();

    const res = await quote({ restaurantId: restaurant._id, address });
    expect(res.status).toBe(200);
    const saved = await Restaurant.findById(restaurant._id);
    expect(saved.address.lat).toBe(53.3417);
  });

  it('requires login and a valid request', async () => {
    const anonymous = await request(app)
      .post('/api/delivery/quote')
      .send({ restaurantId: restaurant._id, address });
    expect(anonymous.status).toBe(401);

    const invalid = await quote({ restaurantId: 'nope', address: { line1: '' } });
    expect(invalid.status).toBe(400);
    expect(invalid.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['restaurantId', 'address.line1', 'address.city'])
    );
  });
});
