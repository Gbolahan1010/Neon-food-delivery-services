const request = require('supertest');
const app = require('../src/app');
const Order = require('../src/models/Order');
const { feeForDistance } = require('../src/services/deliveryService');
const { createUser, createRestaurant, createMenuItem } = require('./helpers');
const { mockGeocode, mockGeocodeNotFound, mockGeocodeDown, CORK } = require('./geoMock');

const address = { line1: '1 Grafton Street', city: 'Dublin 2' };

describe('Orders', () => {
  let owner;
  let ownerCookie;
  let customer;
  let customerCookie;
  let restaurant;
  let pizza;
  let tiramisu;

  const placeOrder = (body, cookie = customerCookie) =>
    request(app).post('/api/orders').set('Cookie', cookie).send(body);

  beforeEach(async () => {
    ({ user: owner, cookie: ownerCookie } = await createUser('owner'));
    ({ user: customer, cookie: customerCookie } = await createUser('customer'));
    restaurant = await createRestaurant(owner);
    pizza = await createMenuItem(restaurant, { name: 'Margherita', priceCents: 1200 });
    tiramisu = await createMenuItem(restaurant, { name: 'Tiramisu', priceCents: 700 });
  });

  describe('placing an order', () => {
    it('uses database prices, merges repeated items and charges delivery by distance', async () => {
      const res = await placeOrder({
        restaurantId: restaurant._id,
        items: [
          { menuItemId: pizza._id, quantity: 1, priceCents: 1 }, // a client-sent price is ignored
          { menuItemId: pizza._id, quantity: 1 },
          { menuItemId: tiramisu._id, quantity: 1 },
        ],
        deliveryAddress: address,
      });

      expect(res.status).toBe(201);
      const order = res.body.data;
      expect(order.items).toHaveLength(2);
      expect(order.items.find((i) => i.name === 'Margherita')).toMatchObject({
        priceCents: 1200,
        quantity: 2,
      });
      expect(order.subtotalCents).toBe(3100);
      // Capel Street (restaurant) to Grafton Street (customer) is roughly 1 km
      expect(order.deliveryDistanceKm).toBeGreaterThan(0.5);
      expect(order.deliveryDistanceKm).toBeLessThan(2);
      expect(order.deliveryFeeCents).toBe(feeForDistance(order.deliveryDistanceKm));
      expect(order.totalCents).toBe(3100 + order.deliveryFeeCents);
      expect(order.deliveryAddress).toMatchObject({ lat: 53.3417, lng: -6.2596 });
      expect(order.status).toBe('placed');
      expect(order.paymentStatus).toBe('pending');
      expect(order.customer).toBe(customer._id.toString());
    });

    it('keeps the price paid even if the menu changes later', async () => {
      const res = await placeOrder({
        restaurantId: restaurant._id,
        items: [{ menuItemId: pizza._id, quantity: 1 }],
        deliveryAddress: address,
      });
      pizza.priceCents = 9999;
      await pizza.save();

      const saved = await Order.findById(res.body.data._id);
      expect(saved.items[0].priceCents).toBe(1200);
    });

    it('rejects items from another restaurant or that are unavailable', async () => {
      const otherRestaurant = await createRestaurant(owner, { name: 'Other' });
      const foreignDish = await createMenuItem(otherRestaurant);
      const soldOut = await createMenuItem(restaurant, { name: 'Sold out', isAvailable: false });

      for (const item of [foreignDish, soldOut]) {
        const res = await placeOrder({
          restaurantId: restaurant._id,
          items: [{ menuItemId: item._id, quantity: 1 }],
          deliveryAddress: address,
        });
        expect(res.status).toBe(400);
      }
      expect(await Order.countDocuments()).toBe(0);
    });

    it('rejects closed or unapproved restaurants and orders under the minimum', async () => {
      const closed = await createRestaurant(owner, { isOpen: false });
      const closedDish = await createMenuItem(closed);
      const res1 = await placeOrder({
        restaurantId: closed._id,
        items: [{ menuItemId: closedDish._id, quantity: 1 }],
        deliveryAddress: address,
      });
      expect(res1.status).toBe(400);

      const pending = await createRestaurant(owner, { isApproved: false });
      const pendingDish = await createMenuItem(pending);
      const res2 = await placeOrder({
        restaurantId: pending._id,
        items: [{ menuItemId: pendingDish._id, quantity: 1 }],
        deliveryAddress: address,
      });
      expect(res2.status).toBe(404);

      restaurant.minimumOrderCents = 5000;
      await restaurant.save();
      const res3 = await placeOrder({
        restaurantId: restaurant._id,
        items: [{ menuItemId: pizza._id, quantity: 1 }],
        deliveryAddress: address,
      });
      expect(res3.status).toBe(400);
      expect(res3.body.message).toMatch(/€50.00/);
    });

    describe('delivery address lookup', () => {
      const order = () => ({
        restaurantId: restaurant._id,
        items: [{ menuItemId: pizza._id, quantity: 1 }],
        deliveryAddress: address,
      });

      it('ignores coordinates sent by the browser and uses the looked-up location', async () => {
        const res = await placeOrder({
          ...order(),
          deliveryAddress: { ...address, lat: 53.3478, lng: -6.2701 }, // pretend to live next door
        });
        expect(res.status).toBe(201);
        expect(res.body.data.deliveryAddress).toMatchObject({ lat: 53.3417, lng: -6.2596 });
        expect(res.body.data.deliveryDistanceKm).toBeGreaterThan(0.5);
      });

      it('refuses addresses outside the delivery radius', async () => {
        mockGeocode(CORK);
        const res = await placeOrder(order());
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/delivers up to 8 km/);
        expect(await Order.countDocuments()).toBe(0);
      });

      it('explains when the address cannot be found', async () => {
        mockGeocodeNotFound();
        const res = await placeOrder(order());
        expect(res.status).toBe(422);
        expect(res.body.message).toMatch(/could not find that address/);
      });

      it('fails safely when the address service is down', async () => {
        mockGeocodeDown();
        const res = await placeOrder(order());
        expect(res.status).toBe(503);
        expect(await Order.countDocuments()).toBe(0);
      });
    });

    it('validates the order and only lets customers place one', async () => {
      const invalid = await placeOrder({ restaurantId: 'nope', items: [], deliveryAddress: {} });
      expect(invalid.status).toBe(400);
      expect(invalid.body.errors.map((e) => e.field)).toEqual(
        expect.arrayContaining(['restaurantId', 'items', 'deliveryAddress.line1'])
      );

      const asOwner = await placeOrder(
        {
          restaurantId: restaurant._id,
          items: [{ menuItemId: pizza._id, quantity: 1 }],
          deliveryAddress: address,
        },
        ownerCookie
      );
      expect(asOwner.status).toBe(403);
    });
  });

  describe('viewing and updating orders', () => {
    let order;

    beforeEach(async () => {
      const res = await placeOrder({
        restaurantId: restaurant._id,
        items: [{ menuItemId: pizza._id, quantity: 1 }],
        deliveryAddress: address,
      });
      order = res.body.data;
    });

    it('shows customers only their own orders', async () => {
      const { cookie: otherCookie } = await createUser('customer');
      const mine = await request(app).get('/api/orders/mine').set('Cookie', customerCookie);
      const theirs = await request(app).get('/api/orders/mine').set('Cookie', otherCookie);
      expect(mine.body.data).toHaveLength(1);
      expect(mine.body.data[0].restaurant.name).toBe('Test Kitchen');
      expect(theirs.body.data).toHaveLength(0);
    });

    it('lets the customer and the restaurant owner view an order, but not strangers', async () => {
      const { cookie: strangerCookie } = await createUser('customer');
      const url = `/api/orders/${order._id}`;
      expect((await request(app).get(url).set('Cookie', customerCookie)).status).toBe(200);
      expect((await request(app).get(url).set('Cookie', ownerCookie)).status).toBe(200);
      expect((await request(app).get(url).set('Cookie', strangerCookie)).status).toBe(403);
    });

    it('lists incoming orders for the owner, filterable by status', async () => {
      const all = await request(app)
        .get(`/api/orders/restaurant/${restaurant._id}`)
        .set('Cookie', ownerCookie);
      expect(all.body.data).toHaveLength(1);
      expect(all.body.data[0].customer.name).toBe('Test customer');

      const delivered = await request(app)
        .get(`/api/orders/restaurant/${restaurant._id}?status=delivered`)
        .set('Cookie', ownerCookie);
      expect(delivered.body.data).toHaveLength(0);
    });

    it('lets the owner move the order through each status in order', async () => {
      for (const status of ['preparing', 'out_for_delivery', 'delivered']) {
        const res = await request(app)
          .patch(`/api/orders/${order._id}/status`)
          .set('Cookie', ownerCookie)
          .send({ status });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe(status);
      }
      const saved = await Order.findById(order._id);
      expect(saved.statusHistory.map((h) => h.status)).toEqual([
        'placed',
        'preparing',
        'out_for_delivery',
        'delivered',
      ]);
    });

    it('blocks skipping a step', async () => {
      const res = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set('Cookie', ownerCookie)
        .send({ status: 'delivered' });
      expect(res.status).toBe(400);
    });

    it('lets the customer cancel a placed order, but nothing else', async () => {
      const prepare = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set('Cookie', customerCookie)
        .send({ status: 'preparing' });
      expect(prepare.status).toBe(403);

      const cancel = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set('Cookie', customerCookie)
        .send({ status: 'cancelled' });
      expect(cancel.status).toBe(200);
      expect(cancel.body.data.status).toBe('cancelled');
    });

    it('blocks other restaurant owners from changing the order', async () => {
      const { cookie: otherOwnerCookie } = await createUser('owner');
      const res = await request(app)
        .patch(`/api/orders/${order._id}/status`)
        .set('Cookie', otherOwnerCookie)
        .send({ status: 'preparing' });
      expect(res.status).toBe(403);
    });
  });
});
