const AppError = require('../utils/AppError');

/** Catches any request that no route matched. */
function notFound(req, res, next) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFound;
