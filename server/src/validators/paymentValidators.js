const { body, query } = require('express-validator');

const checkoutRules = [body('orderId').isMongoId().withMessage('orderId must be a valid id')];

const confirmRules = [
  query('session_id')
    .isString()
    .bail()
    .matches(/^cs_(test|live)_[A-Za-z0-9]{10,200}$/)
    .withMessage('session_id is not a valid Stripe Checkout session id'),
];

module.exports = { checkoutRules, confirmRules };
