const express = require('express');
const controller = require('../controllers/orderController');
const {
  createOrderRules,
  updateStatusRules,
  listOrdersRules,
} = require('../validators/orderValidators');
const { idParam, paginationRules } = require('../validators/common');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.use(protect); // every order route needs a logged-in user

router.post('/', authorize('customer'), createOrderRules, validate, controller.create);
router.get('/mine', authorize('customer'), paginationRules, validate, controller.listMine);
router.get(
  '/restaurant/:id',
  authorize('owner', 'admin'),
  idParam(),
  listOrdersRules,
  validate,
  controller.listForRestaurant
);
router.get('/:id', idParam(), validate, controller.getById);
router.patch('/:id/status', idParam(), updateStatusRules, validate, controller.updateStatus);

module.exports = router;
