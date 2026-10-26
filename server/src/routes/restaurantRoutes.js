const express = require('express');
const controller = require('../controllers/restaurantController');
const {
  createRestaurantRules,
  updateRestaurantRules,
  listRestaurantsRules,
} = require('../validators/restaurantValidators');
const { idParam } = require('../validators/common');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

// Public
router.get('/', listRestaurantsRules, validate, controller.list);

// Owner dashboard (declared before /:id so "mine" is not read as an id)
router.get('/mine', protect, authorize('owner', 'admin'), controller.listMine);

router.get('/:id', idParam(), validate, controller.getById);

// Owners manage their own restaurants; admins can manage any
router.post('/', protect, authorize('owner'), createRestaurantRules, validate, controller.create);
router.put(
  '/:id',
  protect,
  authorize('owner', 'admin'),
  idParam(),
  updateRestaurantRules,
  validate,
  controller.update
);
router.delete('/:id', protect, authorize('owner', 'admin'), idParam(), validate, controller.remove);

module.exports = router;
