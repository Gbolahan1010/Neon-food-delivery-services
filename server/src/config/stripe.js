const Stripe = require('stripe');
const { stripeSecretKey } = require('./env');

/**
 * One shared Stripe client for the whole app (singleton), or null when no key is set,
 * so the rest of the API still works before payments are configured.
 * Only TEST keys (sk_test_...) should ever be used for this project.
 */
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

module.exports = stripe;
