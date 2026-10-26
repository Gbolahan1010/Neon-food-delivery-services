const { body, query } = require('express-validator');
const User = require('../models/User');
const { paginationRules } = require('./common');

const listRestaurantsAdminRules = [
  ...paginationRules,
  query('approved')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('approved must be true or false'),
];

const approvalRules = [
  body('isApproved').isBoolean().withMessage('isApproved must be true or false').toBoolean(),
];

const listUsersRules = [
  ...paginationRules,
  query('role')
    .optional()
    .isIn(User.ROLES)
    .withMessage(`role must be one of: ${User.ROLES.join(', ')}`),
];

const userStatusRules = [
  body('isActive').isBoolean().withMessage('isActive must be true or false').toBoolean(),
];

module.exports = { listRestaurantsAdminRules, approvalRules, listUsersRules, userStatusRules };
