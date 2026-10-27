/**
 * Central configuration. Every environment variable is read here and nowhere else,
 * so the rest of the code never touches process.env directly.
 */
require('dotenv').config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const required = ['MONGO_URI', 'JWT_SECRET'];
if (!isTest) {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}. Copy .env.example to .env and fill them in.`
    );
  }
}

module.exports = {
  nodeEnv,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || (isTest ? 'test-only-secret' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // 'lax' works when the front end proxies /api (see Phase 7). Use 'none' only for cross-site cookies.
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  // Lower cost in tests keeps the suite fast; 12 is the production work factor.
  bcryptRounds: isTest ? 4 : 12,
  // OpenStreetMap's usage policy asks every app to identify itself.
  geocoderUserAgent:
    process.env.GEOCODER_USER_AGENT ||
    'NeonFoodDelivery/1.0 (student project, Dublin Business School)',
  // Payments are optional: without these keys the app runs and payment routes reply 503.
  // Tests use dummy values and never contact Stripe.
  stripeSecretKey:
    process.env.STRIPE_SECRET_KEY || (isTest ? 'sk_test_dummy_key_for_tests' : undefined),
  stripeWebhookSecret:
    process.env.STRIPE_WEBHOOK_SECRET || (isTest ? 'whsec_test_dummy_secret' : undefined),
};
