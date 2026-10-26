const { param, query } = require('express-validator');

/** A route parameter that must be a valid MongoDB id, so bad ids get a 400 instead of a 500. */
const idParam = (name = 'id') => param(name).isMongoId().withMessage(`Invalid ${name}`);

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be 1 or more'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1 to 50'),
];

module.exports = { idParam, paginationRules };
