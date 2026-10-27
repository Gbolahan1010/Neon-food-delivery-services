const request = require('supertest');
const app = require('../src/app');
const stripe = require('../src/config/stripe');
const Order = require('../src/models/Order');
const { stripeWebhookSecret } = require('../src/config/env');
const { createUser, createRestaurant, createMenuItem } = require('./helpers');

// These tests never contact Stripe: API calls are replaced with fakes, and webhook
// signatures are made locally with the test secret, exactly as Stripe would sign them.

describe('Payments with Stripe Checkout', () => {
  let customer;
  let customerCookie;
  let order;

  beforeEach(async () => {
    ({ user: customer, cookie: customerCookie } = await createUser('customer'));
    const { user: owner } = await createUser('owner');
    const restaurant = await createRestaurant(owner);
    const pizza = await createMenuItem(restaurant, { name: 'Margherita', priceCents: 1200 });

    order = await Order.create({
      customer: customer._id,
      restaurant: restaurant._id,
      items: [{ menuItem: pizza._id, name: 'Margherita', priceCents: 1200, quantity: 2 }],
      subtotalCents: 2400,
      deliveryFeeCents: 257,
      totalCents: 2657,
      deliveryAddress: { line1: '1 Grafton Street', city: 'Dublin 2' },
    });
  });

  const fakeSession = (overrides = {}) => ({
    id: 'cs_test_a1b2c3d4e5f6g7h8',
    url: 'https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4e5f6g7h8',
    payment_status: 'paid',
    amount_total: 2657,
    currency: 'eur',
    metadata: { orderId: order._id.toString() },
    ...overrides,
  });

  describe('POST /api/payments/checkout', () => {
    it('creates a Checkout Session from the saved order and returns its URL', async () => {
      const create = jest
        .spyOn(stripe.checkout.sessions, 'create')
        .mockResolvedValue(fakeSession({ payment_status: 'unpaid' }));

      const res = await request(app)
        .post('/api/payments/checkout')
        .set('Cookie', customerCookie)
        .send({ orderId: order._id });

      expect(res.status).toBe(201);
      expect(res.body.data.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);

      const params = create.mock.calls[0][0];
      const charged = params.line_items.reduce(
        (sum, li) => sum + li.price_data.unit_amount * li.quantity,
        0
      );
      expect(charged).toBe(order.totalCents); // dishes + delivery, from the database
      expect(params.line_items.map((li) => li.price_data.product_data.name)).toEqual([
        'Margherita',
        'Delivery',
      ]);
      expect(params.metadata.orderId).toBe(order._id.toString());
      expect(params.success_url).toContain('{CHECKOUT_SESSION_ID}');

      const saved = await Order.findById(order._id);
      expect(saved.stripeSessionId).toBe('cs_test_a1b2c3d4e5f6g7h8');
    });

    it("refuses to pay for someone else's order or a paid order", async () => {
      jest.spyOn(stripe.checkout.sessions, 'create').mockResolvedValue(fakeSession());
      const { cookie: otherCookie } = await createUser('customer');

      const other = await request(app)
        .post('/api/payments/checkout')
        .set('Cookie', otherCookie)
        .send({ orderId: order._id });
      expect(other.status).toBe(403);

      await Order.updateOne({ _id: order._id }, { paymentStatus: 'paid' });
      const paid = await request(app)
        .post('/api/payments/checkout')
        .set('Cookie', customerCookie)
        .send({ orderId: order._id });
      expect(paid.status).toBe(409);
    });

    it('reports a clear error if Stripe refuses the request', async () => {
      jest
        .spyOn(stripe.checkout.sessions, 'create')
        .mockRejectedValue(new Error('Invalid API Key provided'));
      const res = await request(app)
        .post('/api/payments/checkout')
        .set('Cookie', customerCookie)
        .send({ orderId: order._id });
      expect(res.status).toBe(502);
      expect(res.body.message).toMatch(/Invalid API Key/);
    });

    it('is for logged-in customers only', async () => {
      const { cookie: ownerCookie } = await createUser('owner');
      expect((await request(app).post('/api/payments/checkout').send({})).status).toBe(401);
      expect(
        (
          await request(app)
            .post('/api/payments/checkout')
            .set('Cookie', ownerCookie)
            .send({ orderId: order._id })
        ).status
      ).toBe(403);
    });
  });

  describe('POST /api/payments/webhook', () => {
    const sendWebhook = (event, { secret = stripeWebhookSecret, signature } = {}) => {
      const payload = JSON.stringify(event);
      const header = signature ?? stripe.webhooks.generateTestHeaderString({ payload, secret });
      return request(app)
        .post('/api/payments/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', header)
        .send(payload);
    };

    const completedEvent = (session) => ({
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: { object: session },
    });

    it('marks the order paid when Stripe confirms the payment', async () => {
      const res = await sendWebhook(completedEvent(fakeSession()));
      expect(res.status).toBe(200);

      const saved = await Order.findById(order._id);
      expect(saved.paymentStatus).toBe('paid');
      expect(saved.paidAt).toBeInstanceOf(Date);
    });

    it('is safe to receive the same event twice', async () => {
      await sendWebhook(completedEvent(fakeSession()));
      const firstPaidAt = (await Order.findById(order._id)).paidAt;
      const res = await sendWebhook(completedEvent(fakeSession()));

      expect(res.status).toBe(200);
      expect((await Order.findById(order._id)).paidAt).toEqual(firstPaidAt);
    });

    it('rejects requests that are not signed by Stripe', async () => {
      const forged = await sendWebhook(completedEvent(fakeSession()), {
        secret: 'whsec_attacker',
      });
      const unsigned = await sendWebhook(completedEvent(fakeSession()), { signature: '' });

      expect(forged.status).toBe(400);
      expect(unsigned.status).toBe(400);
      expect((await Order.findById(order._id)).paymentStatus).toBe('pending');
    });

    it('does not mark the order paid if the amount does not match', async () => {
      await sendWebhook(completedEvent(fakeSession({ amount_total: 1 })));
      expect((await Order.findById(order._id)).paymentStatus).toBe('pending');
    });
  });

  describe('GET /api/payments/confirm', () => {
    it("checks the session with Stripe and marks the customer's order paid", async () => {
      const retrieve = jest
        .spyOn(stripe.checkout.sessions, 'retrieve')
        .mockResolvedValue(fakeSession());

      const res = await request(app)
        .get('/api/payments/confirm?session_id=cs_test_a1b2c3d4e5f6g7h8')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      expect(res.body.data.paymentStatus).toBe('paid');
      expect(retrieve).toHaveBeenCalledWith('cs_test_a1b2c3d4e5f6g7h8');
    });

    it('rejects malformed session ids without calling Stripe', async () => {
      const retrieve = jest.spyOn(stripe.checkout.sessions, 'retrieve');
      const res = await request(app)
        .get('/api/payments/confirm?session_id=not-a-session')
        .set('Cookie', customerCookie);
      expect(res.status).toBe(400);
      expect(retrieve).not.toHaveBeenCalled();
    });
  });
});
