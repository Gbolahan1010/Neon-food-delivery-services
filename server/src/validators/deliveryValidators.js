const { body } = require('express-validator');
const { addressRules } = require('./addressRules');

const quoteRules = [
  body('restaurantId').isMongoId().withMessage('restaurantId must be a valid id'),
  ...addressRules('address'),
];

module.exports = { quoteRules };
