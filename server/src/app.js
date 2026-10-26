const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { clientUrl, isProd, isTest } = require('./config/env');

const app = express();

// Render (and most hosts) sit behind a proxy: needed for Secure cookies and correct client IPs.
app.set('trust proxy', 1);

// Only our own front end may call the API with cookies.
app.use(cors({ origin: clientUrl, credentials: true }));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
if (!isTest) app.use(morgan(isProd ? 'combined' : 'dev'));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
