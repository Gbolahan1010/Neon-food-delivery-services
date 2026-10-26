const { body } = require('express-validator');
const MenuItem = require('../models/MenuItem');

function menuItemRules({ isUpdate = false } = {}) {
  const required = (chain) => (isUpdate ? chain.optional() : chain);

  return [
    required(body('name'))
      .isString()
      .withMessage('Item name is required')
      .bail()
      .trim()
      .isLength({ min: 1, max: 80 })
      .withMessage('Item name must be 1 to 80 characters'),
    body('description').optional().isString().bail().trim().isLength({ max: 300 }),
    required(body('priceCents'))
      .isInt({ min: 0, max: 100000 })
      .withMessage('Price must be a whole number of cents, e.g. 1250 for €12.50')
      .toInt(),
    body('category').optional().isString().bail().trim().isLength({ min: 1, max: 40 }),
    body('dietary').optional().isArray({ max: MenuItem.DIETARY_TAGS.length }),
    body('dietary.*')
      .isIn(MenuItem.DIETARY_TAGS)
      .withMessage(`Dietary tags must be from: ${MenuItem.DIETARY_TAGS.join(', ')}`),
    body('imageUrl')
      .optional()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Image URL must start with http:// or https://'),
    body('isAvailable')
      .optional()
      .isBoolean()
      .withMessage('isAvailable must be true or false')
      .toBoolean(),
  ];
}

module.exports = {
  createMenuItemRules: menuItemRules(),
  updateMenuItemRules: menuItemRules({ isUpdate: true }),
};
