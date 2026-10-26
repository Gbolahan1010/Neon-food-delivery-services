const { body, query } = require('express-validator');
const Order = require('../models/Order');
const { paginationRules } = require('./common');

// The client sends only WHAT it wants (item ids and quantities). Prices are never accepted
// from the client: the server looks them up, so nobody can change what they pay.
const createOrderRules = [
  body('restaurantId').isMongoId().withMessage('restaurantId must be a valid id'),
  body('items').isArray({ min: 1, max: 50 }).withMessage('Add 1 to 50 items to your order'),
  body('items.*.menuItemId').isMongoId().withMessage('Each item needs a valid menuItemId'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be 1 to 50')
    .toInt(),
  body('deliveryAddress').isObject().withMessage('Delivery address is required'),
  body('deliveryAddress.line1')
    .isString()
    .withMessage('Delivery address line 1 is required')
    .bail()
    .trim()
    .isLength({ min: 1, max: 120 }),
  body('deliveryAddress.line2').optional().isString().bail().trim().isLength({ max: 120 }),
  body('deliveryAddress.city')
    .isString()
    .withMessage('Delivery city is required')
    .bail()
    .trim()
    .isLength({ min: 1, max: 60 }),
  body('deliveryAddress.eircode').optional().isString().bail().trim().isLength({ max: 10 }),
  body('deliveryAddress.lat').optional().isFloat({ min: -90, max: 90 }).toFloat(),
  body('deliveryAddress.lng').optional().isFloat({ min: -180, max: 180 }).toFloat(),
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
