const mongoose = require('mongoose');
const stripe = require('../config/stripe');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');
const { clientUrl, stripeWebhookSecret } = require('../config/env');

/**
 * Payments with Stripe Checkout (test mode).
 * The customer pays on Stripe's own hosted page, so card numbers never touch our server:
 * this keeps the app out of PCI-DSS scope. Stripe then tells us about the payment by
 * calling our webhook, and we only trust that message after checking its signature.
 */

function requireStripe() {
  if (!stripe) throw new AppError('Online payments are not set up yet', 503);
  return stripe;
}

async function createCheckoutSession(orderId, user) {
  const client = requireStripe();

  const order = await Order.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (!order.customer.equals(user._id)) {
    throw AppError.forbidden('You can only pay for your own orders');
  }
  if (order.paymentStatus === 'paid') throw AppError.conflict('This order has already been paid');
  if (order.status === 'cancelled') throw AppError.badRequest('This order was cancelled');

  // Line items are built from the order saved on the server, never from the browser.
  const lineItems = order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: 'eur',
      unit_amount: item.priceCents,
      product_data: { name: item.name },
    },
  }));
  if (order.deliveryFeeCents > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: order.deliveryFeeCents,
        product_data: { name: 'Delivery' },
      },
    });
  }

  const id = order._id.toString();
  const session = await client.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    customer_email: user.email,
    client_reference_id: id,
    metadata: { orderId: id },
    success_url: `${clientUrl}/orders/${id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientUrl}/orders/${id}?payment=cancelled`,
  });

  order.stripeSessionId = session.id;
  await order.save();
  return { url: session.url, sessionId: session.id };
}

/**
 * Marks the order paid if a Checkout Session really was paid in full.
 * Safe to call more than once for the same session (idempotent): Stripe may send
 * the same webhook again, and the browser may also ask us to confirm.
 */
async function markPaidFromSession(session) {
  if (session.payment_status !== 'paid') return null;

  const orderId = session.metadata && session.metadata.orderId;
  if (!orderId || !mongoose.isValidObjectId(orderId)) return null;

  const order = await Order.findById(orderId);
  if (!order) return null;

  if (session.amount_total !== order.totalCents || session.currency !== 'eur') {
    console.warn(`Stripe amount mismatch for order ${orderId}; not marking as paid`);
    return order;
  }

  if (order.paymentStatus !== 'paid') {
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    order.stripeSessionId = session.id;
    await order.save();
  }
  return order;
}

/** Called by Stripe's servers. The raw body is needed to check the signature. */
async function handleWebhook(rawBody, signature) {
  const client = requireStripe();
  if (!stripeWebhookSecret) throw new AppError('Stripe webhooks are not set up yet', 503);

  let event;
  try {
    event = client.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
  } catch {
    // Missing or wrong signature: someone other than Stripe sent this request.
    throw AppError.badRequest('Invalid Stripe signature');
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    await markPaidFromSession(event.data.object);
  }
  return { received: true, type: event.type };
}

/**
 * When Stripe sends the customer back to our site, the page asks us to confirm the payment.
 * We fetch the session from Stripe ourselves rather than trusting the browser's word.
 * This also works locally, where Stripe's webhook cannot reach a development machine.
 */
async function confirmSession(sessionId, user) {
  const client = requireStripe();

  let session;
  try {
    session = await client.checkout.sessions.retrieve(sessionId);
  } catch {
    throw AppError.notFound('Payment session not found');
  }

  const orderId = session.metadata && session.metadata.orderId;
  const order = orderId && mongoose.isValidObjectId(orderId) && (await Order.findById(orderId));
  if (!order) throw AppError.notFound('Order not found');
  if (!order.customer.equals(user._id)) throw AppError.forbidden('This is not your order');

  return (await markPaidFromSession(session)) || order;
}

module.exports = { createCheckoutSession, handleWebhook, confirmSession, markPaidFromSession };
