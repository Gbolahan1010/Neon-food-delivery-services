const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/** Runs after a list of express-validator rules and stops the request with a 400 if any failed. */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result
    .array({ onlyFirstError: true })
    .map((e) => ({ field: e.path, message: e.msg }));
  return next(AppError.badRequest('Validation failed', errors));
}

module.exports = validate;
