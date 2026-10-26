const { body, query } = require('express-validator');
const { paginationRules } = require('./common');

/**
 * One rule set for create and update. On update every field is optional,
 * so owners can send just the fields they are changing.
 * isApproved is deliberately absent: only an admin can approve a restaurant.
 */
function restaurantRules({ isUpdate = false } = {}) {
  const required = (chain) => (isUpdate ? chain.optional() : chain);

  return [
    required(body('name'))
      .isString()
      .withMessage('Name is required')
      .bail()
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must be 2 to 80 characters'),
    body('description')
      .optional()
      .isString()
      .bail()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be at most 500 characters'),
    body('cuisines').optional().isArray({ max: 5 }).withMessage('List up to 5 cuisines'),
    body('cuisines.*')
      .isString()
      .bail()
      .trim()
      .toLowerCase()
      .isLength({ min: 1, max: 30 })
      .withMessage('Each cuisine must be 1 to 30 characters'),
    required(body('address')).isObject().withMessage('Address is required'),
    required(body('address.line1'))
      .isString()
      .withMessage('Address line 1 is required')
      .bail()
      .trim()
      .isLength({ min: 1, max: 120 }),
    required(body('address.city'))
      .isString()
      .withMessage('City is required')
      .bail()
      .trim()
      .isLength({ min: 1, max: 60 }),
    body('address.eircode').optional().isString().bail().trim().isLength({ max: 10 }),
    body('address.lat').optional().isFloat({ min: -90, max: 90 }).toFloat(),
    body('address.lng').optional().isFloat({ min: -180, max: 180 }).toFloat(),
    body('phone').optional().isString().bail().trim().isLength({ max: 20 }),
    body('imageUrl')
      .optional()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Image URL must start with http:// or https://'),
    body('isOpen').optional().isBoolean().withMessage('isOpen must be true or false').toBoolean(),
    body('deliveryRadiusKm')
      .optional()
      .isInt({ min: 1, max: 30 })
      .withMessage('Delivery radius must be 1 to 30 km')
      .toInt(),
    body('minimumOrderCents')
      .optional()
      .isInt({ min: 0, max: 100000 })
      .withMessage('Minimum order must be 0 to 100000 cents')
      .toInt(),
  ];
}

const listRestaurantsRules = [
  ...paginationRules,
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search is too long'),
  query('cuisine').optional().isString().isLength({ max: 30 }).withMessage('Cuisine is too long'),
];

module.exports = {
  createRestaurantRules: restaurantRules(),
  updateRestaurantRules: restaurantRules({ isUpdate: true }),
  listRestaurantsRules,
};
