const { body } = require('express-validator');

// isString().bail() comes first on every field: an object such as { "$gt": "" }
// is rejected immediately, before it can get anywhere near a database query.

const email = () =>
  body('email')
    .isString()
    .withMessage('Email is required and must be text')
    .bail()
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Enter a valid email address')
    .isLength({ max: 254 });

const registerRules = [
  body('name')
    .isString()
    .withMessage('Name is required')
    .bail()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Name must be 2 to 60 characters'),
  email(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: 8, max: 72 })
    .withMessage('Password must be 8 to 72 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain a letter')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  body('role').optional().isIn(['customer', 'owner']).withMessage('Role must be customer or owner'),
];

const loginRules = [
  email(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .notEmpty()
    .withMessage('Password is required'),
];

module.exports = { registerRules, loginRules };
