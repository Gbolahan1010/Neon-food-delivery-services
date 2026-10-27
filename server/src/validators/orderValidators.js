const { body, query } = require('express-validator');
const Order = require('../models/Order');
const { paginationRules } = require('./common');
const { addressRules } = require('./addressRules');

// The client sends only WHAT it wants (item ids and quantities) and WHERE (address text).
// Prices, delivery fee and coordinates are never accepted from the client: the server works
// them out, so nobody can change what they pay.
const createOrderRules = [
  body('restaurantId').isMongoId().withMessage('restaurantId must be a valid id'),
  body('items').isArray({ min: 1, max: 50 }).withMessage('Add 1 to 50 items to your order'),
  body('items.*.menuItemId').isMongoId().withMessage('Each item needs a valid menuItemId'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be 1 to 50')
    .toInt(),
  ...addressRules('deliveryAddress'),
  body('notes').optional().isString().bail().trim().isLength({ max: 300 }),
];

const updateStatusRules = [
  body('status')
    .isIn(Order.STATUSES)
    .withMessage(`Status must be one of: ${Order.STATUSES.join(', ')}`),
];

const listOrdersRules = [
  ...paginationRules,
  query('status')
    .optional()
    .isIn(Order.STATUSES)
    .withMessage(`Status must be one of: ${Order.STATUSES.join(', ')}`),
];

module.exports = { createOrderRules, updateStatusRules, listOrdersRules };
