const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
const paymentController = require('./controllers/paymentController');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { clientUrl, isProd, isTest } = require('./config/env');

const app = express();

// Render (and most hosts) sit behind a proxy: needed for Secure cookies and correct client IPs.
app.set('trust proxy', 1);

// Security headers: Content-Security-Policy, X-Content-Type-Options, HSTS, no X-Powered-By, and more.
app.use(helmet());

// Only our own front end may call the API with cookies.
app.use(cors({ origin: clientUrl, credentials: true }));

// A general ceiling on requests per IP, on top of the stricter limit on /api/auth.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => isTest,
  })
);

// Stripe webhook: mounted BEFORE express.json(), because checking Stripe's signature
// needs the request body exactly as it was sent (raw bytes, not parsed JSON).
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  paymentController.webhook
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
if (!isTest) app.use(morgan(isProd ? 'combined' : 'dev'));

// A friendly answer at the API's base address, instead of "Route not found".
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Neon Food Delivery API',
      health: '/api/health',
      restaurants: '/api/restaurants',
    },
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
