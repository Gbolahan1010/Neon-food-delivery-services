const { body } = require('express-validator');

/**
 * Validation rules for an address object in the request body, e.g. addressRules('deliveryAddress').
 * Only the text of the address is accepted: latitude and longitude are always worked out on the
 * server (see deliveryService), so a browser cannot send fake coordinates to lower its delivery fee.
 */
function addressRules(field) {
  return [
    body(field).isObject().withMessage('Address is required'),
    body(`${field}.line1`)
      .isString()
      .withMessage('Address line 1 is required')
      .bail()
      .trim()
      .isLength({ min: 1, max: 120 })
      .withMessage('Address line 1 must be 1 to 120 characters'),
    body(`${field}.line2`).optional().isString().bail().trim().isLength({ max: 120 }),
    body(`${field}.city`)
      .isString()
      .withMessage('City is required')
      .bail()
      .trim()
      .isLength({ min: 1, max: 60 })
      .withMessage('City must be 1 to 60 characters'),
    body(`${field}.eircode`).optional().isString().bail().trim().isLength({ max: 10 }),
  ];
}

module.exports = { addressRules };
