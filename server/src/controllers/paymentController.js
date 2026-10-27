const { matchedData } = require('express-validator');
const paymentService = require('../services/paymentService');

async function createCheckout(req, res) {
  const { orderId } = matchedData(req, { locations: ['body'] });
  const result = await paymentService.createCheckoutSession(orderId, req.user);
  res.status(201).json({ success: true, data: result });
}

async function confirm(req, res) {
  const { session_id: sessionId } = matchedData(req, { locations: ['query'] });
  const order = await paymentService.confirmSession(sessionId, req.user);
  res.json({ success: true, data: order });
}

/** Stripe webhook: req.body is the raw Buffer here (see app.js). */
async function webhook(req, res) {
  const result = await paymentService.handleWebhook(req.body, req.headers['stripe-signature']);
  res.json(result);
}

module.exports = { createCheckout, confirm, webhook };
