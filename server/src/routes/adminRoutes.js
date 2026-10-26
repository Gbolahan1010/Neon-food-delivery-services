const express = require('express');
const controller = require('../controllers/adminController');
const {
  listRestaurantsAdminRules,
  approvalRules,
  listUsersRules,
  userStatusRules,
} = require('../validators/adminValidators');
const { idParam } = require('../validators/common');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.use(protect, authorize('admin')); // admins only, for everything under /api/admin

router.get('/restaurants', listRestaurantsAdminRules, validate, controller.listRestaurants);
router.patch(
  '/restaurants/:id/approval',
  idParam(),
  approvalRules,
  validate,
  controller.setRestaurantApproval
);
router.get('/users', listUsersRules, validate, controller.listUsers);
router.patch('/users/:id/status', idParam(), userStatusRules, validate, controller.setUserActive);

module.exports = router;
