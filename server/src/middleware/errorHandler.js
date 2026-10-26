const { isProd } = require('../config/env');

/**
 * Global error handler. Every error in the app ends up here and leaves
 * in one consistent shape: { success: false, message, errors? }.
 * Express 5 forwards errors thrown in async handlers here automatically.
 */
// Express needs all four arguments to recognise this as an error handler, so _next stays.
function errorHandler(err, req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = Array.isArray(err.errors) ? err.errors : undefined;

  if (err.name === 'ValidationError') {
    // Mongoose schema validation
    status = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'CastError') {
    // e.g. an invalid ObjectId in the URL
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    // Duplicate key on a unique index
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `That ${field} is already in use`;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Your session is invalid or has expired. Please log in again.';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  }

  if (status >= 500) {
    console.error(err);
    if (isProd) message = 'Something went wrong';
  }

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (!isProd && status >= 500) body.stack = err.stack;

  res.status(status).json(body);
}

module.exports = errorHandler;
